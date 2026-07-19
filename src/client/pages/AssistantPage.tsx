import { useRef, useState } from 'react';
import { conversationReply } from '../../shared/conversation';
import { MIN_QUESTION_LENGTH } from '../../shared/question';
import { queryNotes } from '../services/notes-api';
import { Composer } from '../components/Composer';
import { Conversation } from '../components/Conversation';
import { Header } from '../components/Header';
import { SourcePanel } from '../components/SourcePanel';
import { Welcome } from '../components/Welcome';
import { MAX_HISTORY_LENGTH } from '../constants';
import { useConversationScroll } from '../hooks/useConversationScroll';
import { useHealth } from '../hooks/useHealth';
import { useSourceNote } from '../hooks/useSourceNote';
import type { Exchange } from '../types';

export function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useConversationScroll(history.length, loading);
  const { health, healthError, reindexing, reindex } = useHealth();
  const { selectedSource, openSource, closeSource } = useSourceNote();
  const indexEmpty = health?.chunksIndexed === 0;
  const inputDisabled = loading || indexEmpty;

  async function submitQuestion(value = question): Promise<void> {
    const cleanQuestion = value.trim();
    const conversational = conversationReply(cleanQuestion) !== null;
    if ((!conversational && cleanQuestion.length < MIN_QUESTION_LENGTH) || loading) return;

    setQuestion('');
    setError('');
    setLoading(true);
    try {
      const response = await queryNotes(cleanQuestion);
      setHistory((current) => [...current, {
        id: crypto.randomUUID(),
        question: cleanQuestion,
        response,
      }].slice(-MAX_HISTORY_LENGTH));
    } catch (requestError) {
      setQuestion(cleanQuestion);
      setError(requestError instanceof Error ? requestError.message : 'Could not answer the question.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleReindex(): Promise<void> {
    setError('');
    try {
      await reindex();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Re-indexing failed.');
    }
  }

  return (
    <div className="app-shell">
      <Header
        health={health}
        healthError={healthError}
        reindexing={reindexing}
        onReindex={() => void handleReindex()}
      />
      <main className="chat-layout">
        <section className="conversation" aria-label="Notes conversation">
          {history.length === 0 && (
            <Welcome
              disabled={inputDisabled}
              indexEmpty={indexEmpty}
              onSuggestion={(suggestion) => void submitQuestion(suggestion)}
            />
          )}
          <Conversation history={history} loading={loading} endRef={endRef} onCitation={openSource} />
        </section>
        <Composer
          question={question}
          error={error}
          disabled={inputDisabled}
          inputRef={inputRef}
          onQuestionChange={setQuestion}
          onSubmit={() => void submitQuestion()}
        />
      </main>
      {selectedSource && <SourcePanel selected={selectedSource} onClose={closeSource} />}
    </div>
  );
}
