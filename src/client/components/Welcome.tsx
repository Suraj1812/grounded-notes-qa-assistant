import { QUESTION_SUGGESTIONS } from '../constants';

type WelcomeProps = {
  disabled: boolean;
  indexEmpty: boolean;
  onSuggestion: (suggestion: string) => void;
};

export function Welcome({ disabled, indexEmpty, onSuggestion }: WelcomeProps) {
  return (
    <div className="welcome">
      <h1>Ask your notes.<br />Trust the answer.</h1>
      <p>Answers stay grounded in indexed markdown files. Every claim links back to its source.</p>
      <div className="suggestions">
        {QUESTION_SUGGESTIONS.map((suggestion) => (
          <button onClick={() => onSuggestion(suggestion)} disabled={disabled} key={suggestion}>
            {suggestion}
          </button>
        ))}
      </div>
      {indexEmpty && (
        <p className="empty-index" role="status">
          No markdown notes are indexed. Add notes, then choose Re-index.
        </p>
      )}
    </div>
  );
}
