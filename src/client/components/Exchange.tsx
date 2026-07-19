import type { Citation } from '../../shared/api';
import type { Exchange as ExchangeData } from '../types';
import { AnswerText } from './AnswerText';
import { SparkIcon } from './icons/SparkIcon';

type ExchangeProps = {
  exchange: ExchangeData;
  onCitation: (citation: Citation) => void;
};

export function Exchange({ exchange, onCitation }: ExchangeProps) {
  const { question, response } = exchange;

  return (
    <article className="exchange">
      <div className="question-row">
        <span className="speaker">You</span>
        <p>{question}</p>
      </div>
      <div className={response.refused ? 'answer-row refused' : 'answer-row'}>
        <div className="assistant-mark"><SparkIcon /></div>
        <div className="answer-body">
          <span className="speaker">Grounded</span>
          <AnswerText answer={response.answer} citations={response.citations} onCitation={onCitation} />
          {response.citations.length > 0 && (
            <div className="citations">
              {response.citations.map((citation, index) => (
                <button
                  className="citation-card"
                  onClick={() => onCitation(citation)}
                  key={`${citation.filename}-${citation.startLine}-${citation.endLine}`}
                >
                  <span className="citation-number">{index + 1}</span>
                  <span className="citation-copy">
                    <strong>{citation.filename}</strong>
                    <span>{citation.heading ?? `Lines ${citation.startLine}–${citation.endLine}`}</span>
                  </span>
                  <span className="arrow">↗</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
