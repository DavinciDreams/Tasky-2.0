import { useState, useRef, useCallback, useEffect } from 'react';

export const useScroll = (threshold: number = 56) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const isNearBottom = useCallback((): boolean => {
    try {
      const el = scrollRef.current;
      if (!el) return true;
      return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    } catch {
      return true;
    }
  }, [threshold]);

  const scrollToBottom = useCallback(() => {
    try {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
      setShowJumpToLatest(false);
    } catch {}
  }, []);

  const handleScroll = useCallback(() => {
    try {
      setShowJumpToLatest(!isNearBottom());
    } catch {}
  }, [isNearBottom]);

  // Auto-scroll when near bottom
  const autoScrollIfNeeded = useCallback(() => {
    if (isNearBottom()) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [isNearBottom, scrollToBottom]);

  return {
    scrollRef,
    showJumpToLatest,
    isNearBottom,
    scrollToBottom,
    handleScroll,
    autoScrollIfNeeded,
  };
};
