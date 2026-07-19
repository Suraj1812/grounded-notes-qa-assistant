import path from 'node:path';
import express from 'express';
import { environment } from './config/environment';
import { NotesDatabase } from './database/notes-database';
import { errorHandler } from './middleware/error-handler';
import { Retriever } from './retrieval/retriever';
import { createAdminRouter } from './routes/admin-routes';
import { createApiRouter } from './routes/api-routes';
import { IndexManager } from './services/index-manager';
import { OllamaAnswerGenerator } from './services/ollama-service';
import { QueryService } from './services/query-service';
import type { AnswerGenerator } from './types/domain';

type CreateAppOptions = {
  answerGenerator?: AnswerGenerator;
  notesDirectory?: string;
  similarityThreshold?: number;
  maxContextChunks?: number;
};

export function createApp(
  database = new NotesDatabase(environment.databasePath),
  options: CreateAppOptions = {},
) {
  const app = express();
  const generator = options.answerGenerator ?? new OllamaAnswerGenerator(
    environment.ollamaBaseUrl,
    environment.ollamaModel,
    environment.ollamaTimeoutMs,
  );
  const queryService = new QueryService(
    new Retriever(database),
    generator,
    options.similarityThreshold ?? environment.similarityThreshold,
    options.maxContextChunks ?? environment.maxContextChunks,
  );
  const notesDirectory = options.notesDirectory ?? environment.notesDirectory;
  const indexManager = new IndexManager(notesDirectory, database);

  app.disable('x-powered-by');
  app.use('/api/admin', createAdminRouter(notesDirectory, indexManager));
  app.use('/api', express.json({ limit: '32kb' }));
  app.use('/api', createApiRouter({
    database,
    indexManager,
    model: environment.ollamaModel,
    queryService,
  }));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(environment.projectRoot, 'dist')));
    app.get('/{*splat}', (_request, response) => {
      response.sendFile(path.join(environment.projectRoot, 'dist', 'index.html'));
    });
  }

  app.use(errorHandler);
  return { app, database, indexManager };
}
