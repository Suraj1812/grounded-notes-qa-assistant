import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { SelectedSource } from '../types';
import { MarkdownPreview } from './MarkdownPreview';

type SourcePanelProps = {
  selected: SelectedSource;
  onClose: () => void;
};

export function SourcePanel({ selected, onClose }: SourcePanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const firstHighlightedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    firstHighlightedRef.current?.scrollIntoView({ block: 'center' });
  }, [selected.note]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const leavingStart = event.shiftKey && document.activeElement === first;
    const leavingEnd = !event.shiftKey && document.activeElement === last;
    if (leavingStart || leavingEnd) {
      event.preventDefault();
      (leavingStart ? last : first).focus();
    }
  }

  return (
    <div className="source-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside
        ref={panelRef}
        className="source-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-panel-title"
        aria-describedby="source-panel-meta"
        aria-busy={selected.loading}
        onKeyDown={handleKeyDown}
      >
        <header className="source-panel-header">
          <div>
            <span className="eyebrow">Source note</span>
            <h2 id="source-panel-title">{selected.citation.filename}</h2>
          </div>
          <button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close source panel">×</button>
        </header>
        <div className="source-meta" id="source-panel-meta">
          <span>Lines {selected.citation.startLine}–{selected.citation.endLine}</span>
          <span>{Math.round(selected.citation.score * 100)}% match</span>
        </div>
        {selected.loading && <div className="source-loading" role="status">Loading note…</div>}
        {selected.error && <div className="source-error" role="alert">{selected.error}</div>}
        {selected.note && (
          <div className="note-content">
            <MarkdownPreview
              content={selected.note.content}
              citedStartLine={selected.citation.startLine}
              citedEndLine={selected.citation.endLine}
              firstCitedRef={firstHighlightedRef}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
