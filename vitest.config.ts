import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: [
        'src/server/retrieval/chunker.ts',
        'src/server/retrieval/embeddings.ts',
        'src/server/retrieval/retriever.ts',
      ],
    },
  },
});
