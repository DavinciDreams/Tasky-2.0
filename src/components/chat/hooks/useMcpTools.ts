import { useState, useEffect, useRef, useCallback } from 'react';
import type { ToolEvent, ConfirmState, ChatMessage } from '../types';

export const useMcpTools = (_chatId: string | null) => {
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmState>(null);
  const [pendingResult, setPendingResult] = useState<{ id: string; name: string; args?: any; output?: string } | null>(null);
  const [loadingTools, setLoadingTools] = useState<Set<string>>(new Set());
  const lastResultIdRef = useRef<string | null>(null);

  // Handle tool events
  useEffect(() => {
    const onTool = (e: any) => {
      const detail = e?.detail || {};
      setToolEvents(prev => {
        const others = prev.filter(ev => ev.id !== detail.id);
        return [...others, { ...detail, timestamp: Date.now() }];
      });
      
      // Update loading state
      setLoadingTools(prev => {
        const next = new Set(prev);
        if (detail.phase === 'start') next.add(detail.id);
        if (detail.phase === 'done' || detail.phase === 'error') next.delete(detail.id);
        return next;
      });
    };

    const onToolConfirm = (e: any) => {
      const d = e?.detail || {};
      const card = { id: d.id, name: d.name, args: d.args };
      setPendingConfirm(card);
      
      // Persist to localStorage
      try {
        localStorage.setItem('tasky:pendingConfirm', JSON.stringify(card));
      } catch {}
    };

    window.addEventListener('tasky:tool', onTool as any);
    window.addEventListener('tasky:tool:confirm', onToolConfirm as any);

    return () => {
      window.removeEventListener('tasky:tool', onTool as any);
      window.removeEventListener('tasky:tool:confirm', onToolConfirm as any);
    };
  }, []);

  // Restore stale pending confirmation on mount
  useEffect(() => {
    if (pendingConfirm) return;
    try {
      const raw = localStorage.getItem('tasky:pendingConfirm');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.name) {
          setPendingConfirm(parsed);
        }
      }
    } catch {}
  }, [pendingConfirm]);

  // Show result when tool completes
  useEffect(() => {
    if (!toolEvents || toolEvents.length === 0) return;
    const latestDone = [...toolEvents].reverse().find(ev => ev.phase === 'done');
    if (!latestDone) return;
    if (latestDone.id === lastResultIdRef.current) return;
    
    lastResultIdRef.current = latestDone.id;
    setPendingResult({
      id: latestDone.id,
      name: latestDone.name,
      args: latestDone.args,
      output: latestDone.output,
    });
  }, [toolEvents]);

  // Handle confirmation response
  const handleConfirm = useCallback((accepted: boolean) => {
    if (!pendingConfirm) return;
    
    // Special handling for chat deletion
    if (pendingConfirm.name === 'delete_chat') {
      setPendingConfirm(null);
      try {
        localStorage.removeItem('tasky:pendingConfirm');
      } catch {}
      return pendingConfirm.args?.id; // Return the chat ID to delete
    }
    
    // Send response
    try {
      window.dispatchEvent(new CustomEvent('tasky:tool:confirm:response', {
        detail: { id: pendingConfirm.id, accepted }
      }));
    } catch {}
    
    setPendingConfirm(null);
    try {
      localStorage.removeItem('tasky:pendingConfirm');
    } catch {}
  }, [pendingConfirm]);

  // Create snapshot messages for persistence (only for results, not confirmations)
  const createConfirmSnapshot = useCallback((): ChatMessage | null => {
    // Don't create confirm snapshots since they're now handled inline
    return null;
  }, [pendingConfirm]);

  const createResultSnapshot = useCallback((): ChatMessage | null => {
    if (!pendingResult) return null;
    const snapshot = {
      __taskyCard: {
        kind: 'result',
        name: pendingResult.name,
        args: pendingResult.args,
        output: pendingResult.output,
      }
    };
    return {
      role: 'assistant',
      content: JSON.stringify(snapshot),
    };
  }, [pendingResult]);

  // Clear result after creating snapshot
  const clearResult = useCallback(() => {
    setPendingResult(null);
  }, []);

  return {
    toolEvents,
    pendingConfirm,
    pendingResult,
    loadingTools,
    handleConfirm,
    createConfirmSnapshot,
    createResultSnapshot,
    clearResult,
  };
};
