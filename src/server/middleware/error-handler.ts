import type { ErrorRequestHandler } from 'express';
import { LlmTimeoutError, LlmUnavailableError } from '../services/ollama-service';

type ParserError = Error & {
  status?: number;
  type?: string;
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const parserError = error as ParserError;
  if (parserError.type === 'entity.too.large') {
    response.status(413).json({ error: 'Request body is too large.', code: 'PAYLOAD_TOO_LARGE' });
    return;
  }
  if (parserError.status === 400 && error instanceof SyntaxError) {
    response.status(400).json({ error: 'Request body must be valid JSON.', code: 'MALFORMED_JSON' });
    return;
  }
  if (error instanceof LlmTimeoutError) {
    response.status(504).json({ error: error.message, code: 'LLM_TIMEOUT' });
    return;
  }
  if (error instanceof LlmUnavailableError) {
    response.status(503).json({ error: error.message, code: 'LLM_UNAVAILABLE' });
    return;
  }
  console.error(error);
  response.status(500).json({ error: 'Something went wrong while processing the request.', code: 'INTERNAL_ERROR' });
};
