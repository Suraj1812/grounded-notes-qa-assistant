import { useEffect, useRef, useState } from 'react';
import type { Citation } from '../../shared/api';
import { getSourceNote } from '../services/notes-api';
import type { SelectedSource } from '../types';

export function useSourceNote() {
  const [selectedSource, setSelectedSource] = useState<SelectedSource | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  function openSource(citation: Citation): void {
    requestRef.current?.abort();
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controller = new AbortController();
    requestRef.current = controller;
    setSelectedSource({ citation, note: null, loading: true, error: '' });

    getSourceNote(citation.filename, controller.signal)
      .then((note) => {
        if (!controller.signal.aborted) setSelectedSource({ citation, note, loading: false, error: '' });
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setSelectedSource({
          citation,
          note: null,
          loading: false,
          error: requestError instanceof Error ? requestError.message : 'Could not load the source note.',
        });
      });
  }

  function closeSource(): void {
    requestRef.current?.abort();
    setSelectedSource(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return { selectedSource, openSource, closeSource };
}
