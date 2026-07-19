import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LlmTimeoutError,
  LlmUnavailableError,
  OllamaAnswerGenerator,
} from '../src/server/services/ollama-service';
import type { RetrievedChunk } from '../src/server/types/domain';

const chunks: RetrievedChunk[] = [{
  id: 'chunk-1',
  filename: 'decision.md',
  chunkIndex: 0,
  heading: 'Decision',
  content: 'The decision is documented here.',
  startLine: 1,
  endLine: 1,
  embedding: [1],
  score: 0.8,
}];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OllamaAnswerGenerator', () => {
  it('reports an unavailable Ollama service without exposing the fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED internal detail')));
    const generator = new OllamaAnswerGenerator('http://127.0.0.1:11434', 'local-model', 50);

    const result = generator.generate('What was decided?', chunks);

    await expect(result).rejects.toBeInstanceOf(LlmUnavailableError);
    await expect(result).rejects.not.toThrow(/ECONNREFUSED/);
  });

  it('reports an Ollama timeout separately', async () => {
    const timeout = new Error('timed out');
    timeout.name = 'TimeoutError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout));
    const generator = new OllamaAnswerGenerator('http://127.0.0.1:11434', 'local-model', 50);

    await expect(generator.generate('What was decided?', chunks)).rejects.toBeInstanceOf(LlmTimeoutError);
  });
});
