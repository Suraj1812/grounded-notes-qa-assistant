import type { Citation } from '../../shared/api';

export type NoteChunk = {
  id: string;
  filename: string;
  chunkIndex: number;
  heading: string | null;
  content: string;
  startLine: number;
  endLine: number;
};

export type StoredChunk = NoteChunk & {
  embedding: number[];
};

export type RetrievedChunk = StoredChunk & {
  score: number;
};

export type QueryResult = {
  answer: string;
  citations: Citation[];
  refused: boolean;
};

export interface AnswerGenerator {
  generate(question: string, chunks: RetrievedChunk[]): Promise<string>;
}
