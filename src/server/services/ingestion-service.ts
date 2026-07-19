import { NotesDatabase } from '../database/notes-database';
import { chunkMarkdown } from '../retrieval/chunker';
import { TfidfEmbeddingModel } from '../retrieval/embeddings';
import { readMarkdownNotes } from './note-file-service';

export type IngestionResult = { notes: number; chunks: number };

export async function ingestNotes(
  notesDirectory: string,
  database: NotesDatabase,
): Promise<IngestionResult> {
  const notes = await readMarkdownNotes(notesDirectory);
  const chunks = notes.flatMap((note) => chunkMarkdown(note.filename, note.content));
  const model = TfidfEmbeddingModel.fit(chunks.map((chunk) => chunk.content));

  database.replaceIndex(
    notes,
    chunks.map((chunk) => ({ chunk, embedding: model.embed(chunk.content) })),
    model.toJSON(),
  );

  return { notes: notes.length, chunks: chunks.length };
}
