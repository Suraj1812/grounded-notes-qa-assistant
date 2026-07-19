import type { RequestHandler } from 'express';
import { IndexManager } from '../services/index-manager';

export function createHealthController(indexManager: IndexManager, model: string): RequestHandler {
  return (_request, response) => {
    const index = indexManager.getStatus();
    response.json({
      status: index.chunksIndexed > 0 ? 'ok' : 'empty',
      indexState: index.state,
      notesIndexed: index.notesIndexed,
      chunksIndexed: index.chunksIndexed,
      model,
      lastIndexedAt: index.lastIndexedAt,
    });
  };
}
