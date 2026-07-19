import type { Citation } from '../../shared/api';
import { parseMarkdown } from '../markdown/parse-markdown';
import { MarkdownBlockContent } from './MarkdownBlockContent';

type AnswerTextProps = {
  answer: string;
  citations: Citation[];
  onCitation: (citation: Citation) => void;
};

export function AnswerText({ answer, citations, onCitation }: AnswerTextProps) {
  const blocks = parseMarkdown(answer);
  const renderCitation = (number: number, key: string) => {
    const citation = citations[number - 1];
    return citation ? (
      <button
        className="inline-citation"
        onClick={() => onCitation(citation)}
        aria-label={`Open citation ${number}`}
        key={key}
      >
        [{number}]
      </button>
    ) : `[${number}]`;
  };

  return (
    <div className="answer-text">
      {blocks.map((block) => (
        <div
          className={[
            'answer-markdown-block',
            block.align ? `align-${block.align}` : '',
          ].filter(Boolean).join(' ')}
          key={`${block.type}-${block.startLine}`}
        >
          <MarkdownBlockContent
            block={block}
            renderCitation={renderCitation}
          />
        </div>
      ))}
    </div>
  );
}
