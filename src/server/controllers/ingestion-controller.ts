import type { RequestHandler } from 'express';
import { IndexingInProgressError, IndexManager } from '../services/index-manager';

export function createIngestionController(indexManager: IndexManager): RequestHandler {
  return async (_request, response) => {
    try {
      response.json(await indexManager.rebuild());
    } catch (error) {
      if (error instanceof IndexingInProgressError) {
        response.status(409).json({ error: error.message, code: 'INDEXING_IN_PROGRESS' });
        return;
      }
      response.status(500).json({
        error: 'Could not index the notes directory.',
        code: 'INGESTION_FAILED',
      });
    }
  };
}
