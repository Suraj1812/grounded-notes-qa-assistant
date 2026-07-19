import type { FormEvent, RefObject } from 'react';
import { conversationReply } from '../../shared/conversation';
import { MAX_QUESTION_LENGTH, MIN_QUESTION_LENGTH } from '../../shared/question';

type ComposerProps = {
  question: string;
  error: string;
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onQuestionChange: (question: string) => void;
  onSubmit: () => void;
};

export function Composer({
  question,
  error,
  disabled,
  inputRef,
  onQuestionChange,
  onSubmit,
}: ComposerProps) {
  const canSubmit = question.trim().length >= MIN_QUESTION_LENGTH || conversationReply(question) !== null;

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div className="composer-wrap">
      {error && <div className="error-banner" role="alert">{error}</div>}
      <form className="composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="question-input">Question about your notes</label>
        <input
          id="question-input"
          ref={inputRef}
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="Ask a question about your notes…"
          aria-label="Question"
          maxLength={MAX_QUESTION_LENGTH}
          disabled={disabled}
          aria-describedby="composer-help"
        />
        <button
          type="submit"
          disabled={disabled || !canSubmit}
          aria-label="Ask question"
        >
          ↑
        </button>
      </form>
      <p className="composer-note" id="composer-help">
        Grounded only answers from indexed notes and refuses when evidence is missing.
      </p>
    </div>
  );
}
