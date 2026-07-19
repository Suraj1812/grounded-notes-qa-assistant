import { createServer as createViteServer } from 'vite';
import { createApp } from './app';
import { environment } from './config/environment';

const { app, database, indexManager } = createApp();

if (database.getStats().chunks === 0) {
  const stats = await indexManager.rebuild();
  console.log(`Indexed ${stats.notes} notes into ${stats.chunks} chunks.`);
}

if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    root: 'src/client',
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

const server = app.listen(environment.port, () => {
  console.log(`Notes Q&A Assistant: http://localhost:${environment.port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
