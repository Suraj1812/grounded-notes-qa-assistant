import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import type { Application } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/server/app';
import { NotesDatabase } from '../src/server/database/notes-database';
import { ingestNotes } from '../src/server/services/ingestion-service';
import { LlmTimeoutError, LlmUnavailableError } from '../src/server/services/ollama-service';
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

describe('API', () => {
  let directory: string;
  let notesDirectory: string;
  let database: NotesDatabase;
  let running: RunningServer;
  let generator: AnswerGenerator;

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'grounded-api-test-'));
    notesDirectory = path.join(directory, 'notes');
    fs.mkdirSync(path.join(notesDirectory, 'team'), { recursive: true });
    fs.writeFileSync(
      path.join(notesDirectory, 'team', 'decision.md'),
      '# Caching\n\nDashboard caching uses Redis for fifteen minutes.\n',
    );
    database = new NotesDatabase(path.join(directory, 'notes.db'));
    await ingestNotes(notesDirectory, database);
    generator = {
      generate: vi.fn(async () => 'Dashboard caching uses Redis for fifteen minutes [1].'),
    };
    running = await listen(createApp(database, { answerGenerator: generator, notesDirectory }).app);
  });

  afterEach(async () => {
    await close(running.server);
    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it.each([
    [{ question: '' }, 'INVALID_QUESTION'],
    [{ question: 'x'.repeat(501) }, 'INVALID_QUESTION'],
    [{ question: 42 }, 'INVALID_QUESTION'],
    [{}, 'INVALID_QUESTION'],
  ])('validates question input %#', async (body, expectedCode) => {
    const response = await fetch(`${running.baseUrl}/api/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: expectedCode });
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with a consistent 400 response', async () => {
    const response = await fetch(`${running.baseUrl}/api/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"question":',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: 'MALFORMED_JSON' });
  });

  it('answers conversational messages before reading SQLite or calling the model', async () => {
    const getStats = vi.spyOn(database, 'getStats');
    const getEmbeddingModel = vi.spyOn(database, 'getEmbeddingModel');
    const getChunks = vi.spyOn(database, 'getChunks');
    const response = await fetch(`${running.baseUrl}/api/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: '  HI!!!  ' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      answer: 'Hi! Ask me anything about your indexed notes.',
      citations: [],
      refused: false,
    });
    expect(getStats).not.toHaveBeenCalled();
    expect(getEmbeddingModel).not.toHaveBeenCalled();
    expect(getChunks).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it('sanitizes control characters and repeated whitespace before generation', async () => {
    const response = await fetch(`${running.baseUrl}/api/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: '  What\u0000 does dashboard   caching use?\n' }),
    });

    expect(response.status).toBe(200);
    expect(generator.generate).toHaveBeenCalledWith(
      'What does dashboard caching use?',
      expect.any(Array),
    );
  });

  it('returns valid citations and retrieves a nested source-note path', async () => {
    const queryResponse = await fetch(`${running.baseUrl}/api/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'What does dashboard caching use?' }),
    });
    const queryBody = await queryResponse.json() as { citations: Array<{ filename: string }> };

    expect(queryResponse.status).toBe(200);
    expect(queryBody.citations[0]?.filename).toBe('team/decision.md');

    const noteResponse = await fetch(`${running.baseUrl}/api/notes/team/decision.md`);
    expect(noteResponse.status).toBe(200);
    await expect(noteResponse.json()).resolves.toMatchObject({ filename: 'team/decision.md' });
  });

  it('rejects unsafe note paths and returns 404 for a missing source note', async () => {
    const unsafeResponse = await fetch(`${running.baseUrl}/api/notes/%2e%2e%2Fsecret.md`);
    const missingResponse = await fetch(`${running.baseUrl}/api/notes/team/missing.md`);

    expect(unsafeResponse.status).toBe(400);
    await expect(unsafeResponse.json()).resolves.toMatchObject({ code: 'INVALID_NOTE_PATH' });
    expect(missingResponse.status).toBe(404);
    await expect(missingResponse.json()).resolves.toMatchObject({ code: 'NOTE_NOT_FOUND' });
  });

  it('returns a JSON 404 for unknown API routes', async () => {
    const response = await fetch(`${running.baseUrl}/api/does-not-exist`);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({ code: 'API_NOT_FOUND' });
  });

  it('reports index state and counts for automatic client synchronization', async () => {
    const response = await fetch(`${running.baseUrl}/api/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      indexState: 'idle',
      notesIndexed: 1,
      chunksIndexed: 1,
      lastIndexedAt: expect.any(String),
    });
  });

  it('reports an empty index without calling the LLM', async () => {
    const emptyDatabase = new NotesDatabase(path.join(directory, 'empty.db'));
    const emptyGenerator: AnswerGenerator = { generate: vi.fn() };
    const emptyServer = await listen(createApp(emptyDatabase, { answerGenerator: emptyGenerator }).app);
    try {
      const response = await fetch(`${emptyServer.baseUrl}/api/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: 'What does dashboard caching use?' }),
      });

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toMatchObject({ code: 'INDEX_EMPTY' });
      expect(emptyGenerator.generate).not.toHaveBeenCalled();
    } finally {
      await close(emptyServer.server);
      emptyDatabase.close();
    }
  });

  it('handles ingestion failures with a safe error response', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failedIngestionServer = await listen(createApp(database, {
      answerGenerator: generator,
      notesDirectory: path.join(directory, 'missing-notes'),
    }).app);
    try {
      const response = await fetch(`${failedIngestionServer.baseUrl}/api/ingest`, { method: 'POST' });
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toMatchObject({ code: 'INGESTION_FAILED' });
    } finally {
      errorSpy.mockRestore();
      await close(failedIngestionServer.server);
    }
  });

  it.each([
    [new LlmUnavailableError('Ollama unavailable.'), 503, 'LLM_UNAVAILABLE'],
    [new LlmTimeoutError('Ollama timed out.'), 504, 'LLM_TIMEOUT'],
  ])('maps Ollama failures to safe API responses', async (failure, status, code) => {
    const failingGenerator: AnswerGenerator = { generate: vi.fn(async () => { throw failure; }) };
    const failureServer = await listen(createApp(database, { answerGenerator: failingGenerator }).app);
    try {
      const response = await fetch(`${failureServer.baseUrl}/api/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: 'What does dashboard caching use?' }),
      });

      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toMatchObject({ code });
    } finally {
      await close(failureServer.server);
    }
  });
});
