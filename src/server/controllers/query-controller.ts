import type { RequestHandler } from 'express';
import { conversationReply } from '../../shared/conversation';
import { NotesDatabase } from '../database/notes-database';
import { QueryService } from '../services/query-service';
import { validateQuestion } from '../validation/question-validation';

export function createQueryController(
  database: NotesDatabase,
  queryService: QueryService,
): RequestHandler {
  return async (request, response, next) => {
    const conversationalAnswer = typeof request.body?.question === 'string'
      ? conversationReply(request.body.question)
      : null;
    if (conversationalAnswer) {
      response.json({ answer: conversationalAnswer, citations: [], refused: false });
      return;
    }

    const validation = validateQuestion(request.body?.question);
    if (!validation.valid) {
      response.status(400).json({ error: validation.message, code: 'INVALID_QUESTION' });
      return;
    }

    if (database.getStats().chunks === 0) {
      response.status(503).json({
        error: 'No notes are indexed yet. Add markdown notes and re-index before asking a question.',
        code: 'INDEX_EMPTY',
      });
      return;
    }

    try {
      response.json(await queryService.query(validation.question));
    } catch (error) {
      next(error);
    }
  };
}
