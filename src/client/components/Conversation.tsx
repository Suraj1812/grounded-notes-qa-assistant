import type { RefObject } from 'react';
import type { Citation } from '../../shared/api';
import type { Exchange as ExchangeData } from '../types';
import { Exchange } from './Exchange';
import { SparkIcon } from './icons/SparkIcon';

type ConversationProps = {
  history: ExchangeData[];
  loading: boolean;
  endRef: RefObject<HTMLDivElement | null>;
  onCitation: (citation: Citation) => void;
};

export function Conversation({ history, loading, endRef, onCitation }: ConversationProps) {
  return (
    <div className="exchanges" aria-live="polite" aria-busy={loading}>
      {history.map((exchange) => (
        <Exchange exchange={exchange} onCitation={onCitation} key={exchange.id} />
      ))}
      {loading && (
        <div className="answer-row loading-row" role="status">
          <div className="assistant-mark"><SparkIcon /></div>
          <div className="thinking"><i /><i /><i /><span>Reading your notes</span></div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
