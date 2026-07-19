import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { SerializedEmbeddingModel } from '../retrieval/embeddings';
import type { NoteChunk, StoredChunk } from '../types/domain';

type ChunkRow = {
  id: string;
  filename: string;
  chunk_index: number;
  heading: string | null;
  content: string;
  start_line: number;
  end_line: number;
  embedding: string;
};

export class NotesDatabase {
  private readonly database: Database.Database;

  constructor(databasePath: string) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma('journal_mode = WAL');
    this.database.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        filename TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        indexed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL REFERENCES notes(filename) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        heading TEXT,
        content TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        embedding TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_filename ON chunks(filename);
    `);
  }

  replaceIndex(
    notes: Array<{ filename: string; content: string }>,
    chunks: Array<{ chunk: NoteChunk; embedding: number[] }>,
    embeddingModel: SerializedEmbeddingModel,
  ): void {
    const insertNote = this.database.prepare(
      'INSERT INTO notes (filename, content, indexed_at) VALUES (?, ?, ?)',
    );
    const insertChunk = this.database.prepare(`
      INSERT INTO chunks
        (id, filename, chunk_index, heading, content, start_line, end_line, embedding)
      VALUES
        (@id, @filename, @chunkIndex, @heading, @content, @startLine, @endLine, @embedding)
    `);
    const insertMetadata = this.database.prepare(
      'INSERT INTO metadata (key, value) VALUES (?, ?)',
    );

    this.database.transaction(() => {
      this.database.exec('DELETE FROM chunks; DELETE FROM notes; DELETE FROM metadata;');
      const indexedAt = new Date().toISOString();
      notes.forEach((note) => insertNote.run(note.filename, note.content, indexedAt));
      chunks.forEach(({ chunk, embedding }) =>
        insertChunk.run({ ...chunk, embedding: JSON.stringify(embedding) }));
      insertMetadata.run('embedding_model', JSON.stringify(embeddingModel));
      insertMetadata.run('indexed_at', indexedAt);
    })();
  }

  getEmbeddingModel(): SerializedEmbeddingModel | null {
    const row = this.database.prepare('SELECT value FROM metadata WHERE key = ?').get('embedding_model') as
      | { value: string }
      | undefined;
    return row ? JSON.parse(row.value) as SerializedEmbeddingModel : null;
  }

  getChunks(): StoredChunk[] {
    const rows = this.database.prepare(`
      SELECT id, filename, chunk_index, heading, content, start_line, end_line, embedding
      FROM chunks
      ORDER BY filename, chunk_index
    `).all() as ChunkRow[];

    return rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      chunkIndex: row.chunk_index,
      heading: row.heading,
      content: row.content,
      startLine: row.start_line,
      endLine: row.end_line,
      embedding: JSON.parse(row.embedding) as number[],
    }));
  }

  getNote(filename: string): { filename: string; content: string } | null {
    const row = this.database.prepare('SELECT filename, content FROM notes WHERE filename = ?').get(filename) as
      | { filename: string; content: string }
      | undefined;
    return row ?? null;
  }

  getStats(): { notes: number; chunks: number; indexedAt: string | null } {
    const notes = this.database.prepare('SELECT COUNT(*) AS count FROM notes').get() as { count: number };
    const chunks = this.database.prepare('SELECT COUNT(*) AS count FROM chunks').get() as { count: number };
    const indexedAt = this.database.prepare('SELECT value FROM metadata WHERE key = ?').get('indexed_at') as
      | { value: string }
      | undefined;
    return { notes: notes.count, chunks: chunks.count, indexedAt: indexedAt?.value ?? null };
  }

  close(): void {
    this.database.close();
  }
}
