import { json, Router } from 'express';
import {
  createAdminOverviewController,
  createDeleteNoteController,
  createRebuildIndexController,
  createUploadNotesController,
} from '../controllers/admin-controller';
import { IndexManager } from '../services/index-manager';

export function createAdminRouter(notesDirectory: string, indexManager: IndexManager): Router {
  const router = Router();
  router.get('/', createAdminOverviewController(notesDirectory, indexManager));
  router.post('/notes', json({ limit: '5mb' }), createUploadNotesController(notesDirectory, indexManager));
  router.delete('/notes/:filename', createDeleteNoteController(notesDirectory, indexManager));
  router.post('/index', createRebuildIndexController(indexManager));
  router.use((_request, response) => {
    response.status(404).json({ error: 'Admin API route not found.', code: 'API_NOT_FOUND' });
  });
  return router;
}
