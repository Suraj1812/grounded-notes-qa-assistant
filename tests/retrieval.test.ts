import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NotesDatabase } from '../src/server/database/notes-database';
import { TfidfEmbeddingModel } from '../src/server/retrieval/embeddings';
import { Retriever } from '../src/server/retrieval/retriever';
import type { StoredChunk } from '../src/server/types/domain';
import { ingestNotes } from '../src/server/services/ingestion-service';

describe('Retriever', () => {
  let directory: string;
  let database: NotesDatabase;
  let retriever: Retriever;

  beforeEach(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-qa-test-'));
    database = new NotesDatabase(path.join(directory, 'test.db'));
    await ingestNotes(path.resolve('tests/fixtures/notes'), database);
    retriever = new Retriever(database);
  });

  afterEach(() => {
    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it.each([
    ['Which catalog search tool did the team select?', 'alpha.md'],
    ['When does the support handoff happen?', 'beta.md'],
    ['When does the Montréal pilot begin?', 'unicode.md'],
  ])('retrieves the correct fixture for: %s', (question, expectedFile) => {
    const results = retriever.search(question, 2);
    expect(results[0]?.filename).toBe(expectedFile);
    expect(results[0]?.score).toBeGreaterThan(0.12);
  });

  it('returns nothing when the query vocabulary is absent from the notes', () => {
    expect(retriever.search('Who won the underwater chess championship?')).toEqual([]);
  });

  it('gives relevant files a context slot before adding more chunks from one file', () => {
    const documents = [
      'Redis caching API response example',
      'Redis caching query example',
      'Redis caching evaluation example',
      'The team decided Redis caching uses a fifteen minute TTL',
      'The security note mentions caching controls',
    ];
    const model = TfidfEmbeddingModel.fit(documents);
    const filenames = ['README.md', 'README.md', 'README.md', 'decision.md', 'security.md'];
    const chunks: StoredChunk[] = documents.map((content, index) => ({
      id: `chunk-${index}`,
      filename: filenames[index],
      chunkIndex: index,
      heading: null,
      content,
      startLine: index + 1,
      endLine: index + 1,
      embedding: model.embed(content),
    }));
    const sourceDiverseRetriever = new Retriever({
      getEmbeddingModel: () => model.toJSON(),
      getChunks: () => chunks,
    } as unknown as NotesDatabase);

    const results = sourceDiverseRetriever.search('What was decided about Redis caching?', 3);

    expect(results.map((chunk) => chunk.filename)).toEqual([
      'decision.md',
      'README.md',
      'security.md',
    ]);
  });

  it('keeps a precise Markdown heading from being diluted by a long chunk', () => {
    const content = `Caching decision\n${'general project background '.repeat(120)}`;
    const model = TfidfEmbeddingModel.fit([content]);
    const headingAwareRetriever = new Retriever({
      getEmbeddingModel: () => model.toJSON(),
      getChunks: () => [{
        id: 'long-chunk',
        filename: 'planning.md',
        chunkIndex: 0,
        heading: 'Caching decision',
        content,
        startLine: 1,
        endLine: 10,
        embedding: model.embed(content),
      }],
    } as unknown as NotesDatabase);

    const results = headingAwareRetriever.search('What was the caching decision?', 1, 0.12);

    expect(results).toHaveLength(1);
    expect(results[0]?.heading).toBe('Caching decision');
    expect(results[0]?.score).toBeGreaterThanOrEqual(0.12);
  });
});
