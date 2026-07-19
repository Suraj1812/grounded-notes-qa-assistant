import { Router } from 'express';
import { createHealthController } from '../controllers/health-controller';
import { createIngestionController } from '../controllers/ingestion-controller';
import { createNoteController } from '../controllers/note-controller';
import { createQueryController } from '../controllers/query-controller';
import { NotesDatabase } from '../database/notes-database';
import { IndexManager } from '../services/index-manager';
import { QueryService } from '../services/query-service';

type ApiRouterOptions = {
  database: NotesDatabase;
  indexManager: IndexManager;
  model: string;
  queryService: QueryService;
};

export function createApiRouter({
  database,
  indexManager,
  model,
  queryService,
}: ApiRouterOptions): Router {
  const router = Router();
  router.get('/health', createHealthController(indexManager, model));
  router.post('/ingest', createIngestionController(indexManager));
  router.post('/query', createQueryController(database, queryService));
  router.get('/notes/*filename', createNoteController(database));
  router.use((_request, response) => {
    response.status(404).json({ error: 'API route not found.', code: 'API_NOT_FOUND' });
  });
  return router;
}
