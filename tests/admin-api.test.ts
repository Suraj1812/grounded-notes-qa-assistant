import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import type { Application } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOverviewResponse } from '../src/shared/api';
import { createApp } from '../src/server/app';
import { NotesDatabase } from '../src/server/database/notes-database';
import { ingestNotes } from '../src/server/services/ingestion-service';
import type { AnswerGenerator } from '../src/server/types/domain';

type RunningServer = {
  baseUrl: string;
  server: Server;
};

async function listen(app: Application): Promise<RunningServer> {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not expose a port');
  return { baseUrl: `http://127.0.0.1:${address.port}`, server };
}

async function close(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function waitForIndex(baseUrl: string): Promise<AdminOverviewResponse> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const result = await fetch(`${baseUrl}/api/admin`).then(
      (response) => response.json() as Promise<AdminOverviewResponse>,
    );
    if (result.index.state !== 'indexing') return result;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Index rebuild did not finish');
}

describe('Admin API', () => {
  let directory: string;
  let notesDirectory: string;
  let database: NotesDatabase;
  let running: RunningServer;

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'grounded-admin-test-'));
    notesDirectory = path.join(directory, 'notes');
    fs.mkdirSync(path.join(notesDirectory, 'team'), { recursive: true });
    fs.writeFileSync(path.join(notesDirectory, 'existing.md'), '# Existing\n\nOriginal content.\n');
    fs.writeFileSync(path.join(notesDirectory, 'team', 'nested.md'), '# Nested\n\nNested content.\n');
    database = new NotesDatabase(path.join(directory, 'notes.db'));
    await ingestNotes(notesDirectory, database);
    const generator: AnswerGenerator = { generate: vi.fn(async () => 'A grounded answer [1].') };
    running = await listen(createApp(database, { answerGenerator: generator, notesDirectory }).app);
  });

  afterEach(async () => {
    await close(running.server);
    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('reports editable files and index metadata', async () => {
    const response = await fetch(`${running.baseUrl}/api/admin`);
    const body = await response.json() as AdminOverviewResponse;

    expect(response.status).toBe(200);
    expect(body.notes.map((note) => note.filename)).toEqual(['existing.md']);
    expect(body.index).toMatchObject({ state: 'idle', notesIndexed: 2, chunksIndexed: 2 });
    expect(body.index.lastIndexedAt).toEqual(expect.any(String));
  });

  it('uploads new notes and atomically replaces matching filenames', async () => {
    const response = await fetch(`${running.baseUrl}/api/admin/notes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ files: [
        { filename: 'existing.md', content: '# Existing\n\nReplacement content.\n' },
        { filename: 'new-note.md', content: '# New\n\nNew content.\n' },
      ] }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      message: '2 Markdown files saved. Index rebuild started.',
    });
    expect(fs.readFileSync(path.join(notesDirectory, 'existing.md'), 'utf8')).toContain('Replacement');
    expect(fs.readFileSync(path.join(notesDirectory, 'new-note.md'), 'utf8')).toContain('New content');
  });

  it.each([
    ['../outside.md', 'content', 400],
    ['notes.txt', 'content', 400],
    ['large.md', 'x'.repeat(512 * 1024 + 1), 413],
  ])('rejects an unsafe upload for %s', async (filename, content, status) => {
    const response = await fetch(`${running.baseUrl}/api/admin/notes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ files: [{ filename, content }] }),
    });

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_NOTE_UPLOAD' });
    expect(fs.existsSync(path.join(directory, 'outside.md'))).toBe(false);
  });

  it('deletes a managed note and returns 404 when it is already missing', async () => {
    const first = await fetch(`${running.baseUrl}/api/admin/notes/existing.md`, { method: 'DELETE' });
    const overview = await waitForIndex(running.baseUrl);
    const second = await fetch(`${running.baseUrl}/api/admin/notes/existing.md`, { method: 'DELETE' });

    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ message: 'existing.md deleted. Index rebuild started.' });
    expect(overview.index).toMatchObject({ state: 'idle', notesIndexed: 1, chunksIndexed: 1 });
    expect(second.status).toBe(404);
    expect(fs.existsSync(path.join(notesDirectory, 'existing.md'))).toBe(false);
  });

  it('automatically rebuilds through the shared ingestion pipeline after uploads', async () => {
    const uploadResponse = await fetch(`${running.baseUrl}/api/admin/notes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ files: [{ filename: 'published.md', content: '# Published\n\nIndexed text.\n' }] }),
    });
    const overview = await waitForIndex(running.baseUrl);
    const noteResponse = await fetch(`${running.baseUrl}/api/notes/published.md`);

    expect(uploadResponse.status).toBe(201);
    expect(overview.index).toMatchObject({ state: 'idle', notesIndexed: 3, chunksIndexed: 3 });
    expect(noteResponse.status).toBe(200);
  });

  it('keeps the manual rebuild endpoint available', async () => {
    const response = await fetch(`${running.baseUrl}/api/admin/index`, { method: 'POST' });
    const overview = await waitForIndex(running.baseUrl);

    expect(response.status).toBe(202);
    expect(overview.index).toMatchObject({ state: 'idle', notesIndexed: 2, chunksIndexed: 2 });
  });
});
