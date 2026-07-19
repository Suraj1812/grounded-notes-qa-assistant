import { GROUNDED_SYSTEM_PROMPT } from '../prompts/grounded-prompt';
import type { AnswerGenerator, RetrievedChunk } from '../types/domain';

type OllamaResponse = {
  response?: string;
};

export class LlmUnavailableError extends Error {}
export class LlmTimeoutError extends Error {}

export class OllamaAnswerGenerator implements AnswerGenerator {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs = 90_000,
  ) {}

  async generate(question: string, chunks: RetrievedChunk[]): Promise<string> {
    const sources = chunks.map((chunk, index) =>
      `[${index + 1}] ${chunk.filename}${chunk.heading ? ` — ${chunk.heading}` : ''}\n${chunk.content}`)
      .join('\n\n');

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          system: GROUNDED_SYSTEM_PROMPT,
          prompt: `<sources>\n${sources}\n</sources>\n\nQuestion: ${question}`,
          options: { temperature: 0.1 },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new LlmTimeoutError(
          `Ollama did not respond within ${Math.ceil(this.timeoutMs / 1000)} seconds. Try again.`,
          { cause: error },
        );
      }
      throw new LlmUnavailableError(
        `Could not reach Ollama at ${this.baseUrl}. Run "ollama run ${this.model}" and try again.`,
        { cause: error },
      );
    }

    let body: OllamaResponse;
    try {
      body = await response.json() as OllamaResponse;
    } catch (error) {
      throw new LlmUnavailableError('Ollama returned an invalid response.', { cause: error });
    }

    if (!response.ok || !body.response) {
      throw new LlmUnavailableError(
        response.ok ? 'Ollama returned an empty response.' : `Ollama returned HTTP ${response.status}.`,
      );
    }
    return body.response.trim();
  }
}
