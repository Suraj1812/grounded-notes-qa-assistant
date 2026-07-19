import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const projectRoot = path.resolve(import.meta.dirname, '../../..');

function numberFromEnvironment(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export const environment = {
  projectRoot,
  port: numberFromEnvironment('PORT', 3000),
  notesDirectory: path.resolve(projectRoot, process.env.NOTES_DIR ?? 'fixtures/notes'),
  databasePath: path.resolve(projectRoot, process.env.DATABASE_PATH ?? 'data/notes.db'),
  similarityThreshold: numberFromEnvironment('SIMILARITY_THRESHOLD', 0.12),
  maxContextChunks: numberFromEnvironment('MAX_CONTEXT_CHUNKS', 3),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen2.5:3b',
  ollamaTimeoutMs: numberFromEnvironment('OLLAMA_TIMEOUT_MS', 90_000),
};
