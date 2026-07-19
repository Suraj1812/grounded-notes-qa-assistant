import { useEffect, useRef } from 'react';

export function useConversationScroll(historyLength: number, loading: boolean) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [historyLength, loading]);

  return endRef;
}
