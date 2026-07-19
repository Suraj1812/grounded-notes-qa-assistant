import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AdminNote } from '../../shared/api';

export type MarkdownNote = {
  filename: string;
  content: string;
};

function isMarkdownFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith('.md');
}

export function isSafeUploadFilename(filename: unknown): filename is string {
  return typeof filename === 'string'
    && filename.length > 3
    && filename.length <= 128
    && filename === filename.trim()
    && !filename.startsWith('.')
    && !/[\/\\\u0000-\u001f\u007f]/.test(filename)
    && path.posix.basename(filename) === filename
    && path.win32.basename(filename) === filename
    && isMarkdownFilename(filename);
}

export async function readMarkdownNotes(directory: string, root = directory): Promise<MarkdownNote[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const notes = await Promise.all(entries.map(async (entry): Promise<MarkdownNote[]> => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readMarkdownNotes(absolutePath, root);
    if (!entry.isFile() || !isMarkdownFilename(entry.name)) return [];
    return [{
      filename: path.relative(root, absolutePath).split(path.sep).join('/'),
      content: await fs.readFile(absolutePath, 'utf8'),
    }];
  }));

  return notes.flat().sort((left, right) => left.filename.localeCompare(right.filename));
}

export async function listEditableNotes(directory: string): Promise<AdminNote[]> {
  await fs.mkdir(directory, { recursive: true });
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const notes = await Promise.all(entries.map(async (entry): Promise<AdminNote | null> => {
    if (!entry.isFile() || !isMarkdownFilename(entry.name)) return null;
    const stats = await fs.stat(path.join(directory, entry.name));
    return { filename: entry.name, size: stats.size, updatedAt: stats.mtime.toISOString() };
  }));

  return notes
    .filter((note): note is AdminNote => note !== null)
    .sort((left, right) => left.filename.localeCompare(right.filename));
}

export async function saveMarkdownNotes(directory: string, notes: MarkdownNote[]): Promise<void> {
  await fs.mkdir(directory, { recursive: true });
  for (const note of notes) {
    if (!isSafeUploadFilename(note.filename)) throw new Error('Unsafe markdown filename.');
    const targetPath = path.join(directory, note.filename);
    const temporaryPath = path.join(directory, `.${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temporaryPath, note.content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      await fs.rename(temporaryPath, targetPath);
    } finally {
      await fs.rm(temporaryPath, { force: true });
    }
  }
}

export async function deleteMarkdownNote(directory: string, filename: string): Promise<boolean> {
  if (!isSafeUploadFilename(filename)) throw new Error('Unsafe markdown filename.');
  try {
    const targetPath = path.join(directory, filename);
    const stats = await fs.lstat(targetPath);
    if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('The note is not a regular file.');
    await fs.unlink(targetPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
