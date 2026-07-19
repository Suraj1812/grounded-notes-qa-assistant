import { NotesDatabase } from '../database/notes-database';
import type { RetrievedChunk } from '../types/domain';
import { cosineSimilarity, TfidfEmbeddingModel } from './embeddings';

const HEADING_MATCH_WEIGHT = 2;

function selectSourceDiverse(chunks: RetrievedChunk[], limit: number): RetrievedChunk[] {
  if (limit <= 0) return [];

  const selected: RetrievedChunk[] = [];
  const selectedIds = new Set<string>();
  const selectedFiles = new Set<string>();

  for (const chunk of chunks) {
    if (selectedFiles.has(chunk.filename)) continue;
    selected.push(chunk);
    selectedIds.add(chunk.id);
    selectedFiles.add(chunk.filename);
    if (selected.length === limit) return selected;
  }

  for (const chunk of chunks) {
    if (selectedIds.has(chunk.id)) continue;
    selected.push(chunk);
    if (selected.length === limit) break;
  }

  return selected;
}

export class Retriever {
  constructor(private readonly database: NotesDatabase) {}

  search(question: string, limit = 3, minimumScore = 0): RetrievedChunk[] {
    const serializedModel = this.database.getEmbeddingModel();
    if (!serializedModel) return [];

    const model = TfidfEmbeddingModel.fromJSON(serializedModel);
    const queryEmbedding = model.embed(question);
    if (queryEmbedding.every((value) => value === 0)) return [];

    const ranked = this.database.getChunks()
      .map((chunk) => {
        const contentScore = cosineSimilarity(queryEmbedding, chunk.embedding);
        const headingScore = chunk.heading
          ? cosineSimilarity(queryEmbedding, model.embed(chunk.heading))
          : 0;
        return {
          ...chunk,
          score: Math.max(contentScore, Math.min(1, headingScore * HEADING_MATCH_WEIGHT)),
        };
      })
      .filter((chunk) => chunk.score > 0 && chunk.score >= minimumScore)
      .sort((left, right) => right.score - left.score);

    return selectSourceDiverse(ranked, limit);
  }
}
