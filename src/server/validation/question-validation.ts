import { MAX_QUESTION_LENGTH, MIN_QUESTION_LENGTH } from '../../shared/question';

export type QuestionValidation =
  | { valid: true; question: string }
  | { valid: false; message: string };

export function validateQuestion(value: unknown): QuestionValidation {
  if (typeof value !== 'string') {
    return { valid: false, message: 'Question must be a string between 3 and 500 characters.' };
  }

  const question = value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  if (question.length < MIN_QUESTION_LENGTH || question.length > MAX_QUESTION_LENGTH) {
    return { valid: false, message: 'Question must be between 3 and 500 characters.' };
  }

  return { valid: true, question };
}
