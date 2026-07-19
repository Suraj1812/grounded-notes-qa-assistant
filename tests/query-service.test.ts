import { describe, expect, it, vi } from 'vitest';
import type { Retriever } from '../src/server/retrieval/retriever';
import { NO_INFORMATION_ANSWER, QueryService } from '../src/server/services/query-service';
import type { AnswerGenerator, RetrievedChunk } from '../src/server/types/domain';

const relevantChunk: RetrievedChunk = {
  id: 'chunk-1',
  filename: 'team/decision.md',
  chunkIndex: 0,
  heading: 'Caching',
  content: '# Caching\n\nDashboard caching uses Redis for fifteen minutes.',
  startLine: 1,
  endLine: 3,
  embedding: [1],
  score: 0.72,
};

function retrieverReturning(chunks: RetrievedChunk[]): Retriever {
  return { search: vi.fn(() => chunks) } as unknown as Retriever;
}

describe('QueryService', () => {
  it.each([
    ['hello', 'Hi! Ask me anything about your indexed notes.'],
    ['thank you', "You're welcome! Feel free to ask another question about your notes."],
  ])('handles the conversational message “%s” without retrieval', async (question, answer) => {
    const search = vi.fn(() => [relevantChunk]);
    const generator: AnswerGenerator = { generate: vi.fn() };
    const service = new QueryService({ search } as unknown as Retriever, generator, 0.12);

    await expect(service.query(question)).resolves.toEqual({
      answer,
      citations: [],
      refused: false,
    });
    expect(search).not.toHaveBeenCalled();
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it('refuses an unsupported question without calling the answer generator', async () => {
    const generator: AnswerGenerator = { generate: vi.fn() };
    const service = new QueryService(retrieverReturning([]), generator, 0.12);

    await expect(service.query('Who won the underwater chess championship?')).resolves.toEqual({
      answer: NO_INFORMATION_ANSWER,
      citations: [],
      refused: true,
    });
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it('refuses chunks below the configured threshold without calling the answer generator', async () => {
    const generator: AnswerGenerator = { generate: vi.fn() };
    const weakChunk = { ...relevantChunk, score: 0.11 };
    const service = new QueryService(retrieverReturning([weakChunk]), generator, 0.12);

    await expect(service.query('What does dashboard caching use?')).resolves.toEqual({
      answer: NO_INFORMATION_ANSWER,
      citations: [],
      refused: true,
    });
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("normalizes the model's uncertainty into the public refusal response", async () => {
    const generator: AnswerGenerator = {
      generate: vi.fn(async () => "I don't know based on the provided notes."),
    };
    const service = new QueryService(retrieverReturning([relevantChunk]), generator, 0.12);

    await expect(service.query('What does dashboard caching use?')).resolves.toEqual({
      answer: NO_INFORMATION_ANSWER,
      citations: [],
      refused: true,
    });
  });

  it('returns citations derived from retrieved chunks for a supported answer', async () => {
    const generator: AnswerGenerator = {
      generate: vi.fn(async () => 'Dashboard caching uses Redis for fifteen minutes [1].'),
    };
    const service = new QueryService(retrieverReturning([relevantChunk]), generator, 0.12);

    const result = await service.query('What does dashboard caching use?');

    expect(result.refused).toBe(false);
    expect(result.citations).toEqual([expect.objectContaining({
      filename: 'team/decision.md',
      heading: 'Caching',
      startLine: 1,
      endLine: 3,
    })]);
    expect(generator.generate).toHaveBeenCalledOnce();
  });

  it('passes the similarity threshold into source-diverse retrieval', async () => {
    const search = vi.fn(() => [relevantChunk]);
    const generator: AnswerGenerator = {
      generate: vi.fn(async () => 'Dashboard caching uses Redis for fifteen minutes [1].'),
    };
    const service = new QueryService({ search } as unknown as Retriever, generator, 0.12, 3);

    await service.query('What does dashboard caching use?');

    expect(search).toHaveBeenCalledWith('What does dashboard caching use?', 3, 0.12);
  });

  it('returns only the context sources referenced by the answer', async () => {
    const secondaryChunk: RetrievedChunk = {
      ...relevantChunk,
      id: 'chunk-2',
      filename: 'team/follow-up.md',
      heading: 'Follow-up',
      score: 0.6,
    };
    const generator: AnswerGenerator = {
      generate: vi.fn(async () => 'The follow-up is documented separately [2].'),
    };
    const service = new QueryService(
      retrieverReturning([relevantChunk, secondaryChunk]),
      generator,
      0.12,
    );

    const result = await service.query('Where is the follow-up documented?');

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]?.filename).toBe('team/follow-up.md');
  });
});
