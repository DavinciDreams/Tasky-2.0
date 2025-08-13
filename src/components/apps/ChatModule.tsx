import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Settings as Cog, AlertCircle } from 'lucide-react';

// AI SDK imports
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// UI Components
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Modal } from '../ui/modal';

// Types and Tools
import type { Settings as AppSettings } from '../../types';
import { mcpCall } from '../../ai/mcp-tools';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

interface ChatModuleProps {
  settings: AppSettings;
  onSettingChange?: (key: keyof AppSettings, value: any) => void;
}

/**
 * Enhanced Chat Module with AI SDK integration
 * 
 * Features:
 * - Multi-step tool calls with error repair
 * - Beautiful confirmation UI with structured previews
 * - Stream consumption for reliability
 * - Enhanced loading states and animations
 * - MCP integration with your existing server
 */
export const ChatModule: React.FC<ChatModuleProps> = ({ settings, onSettingChange }) => {
  const TASKY_DEFAULT_PROMPT = 'You are Tasky, the in‑app assistant for Tasky. Stay concise, helpful, and focused on Tasky features: general conversation/ideation plus managing Tasks and Reminders.\n\nWhen users want to create, list, update, or delete tasks or reminders, use the mcpCall tool with the appropriate MCP tool name:\n- tasky_create_task: Create tasks with title, description, dueDate, tags, etc.\n- tasky_list_tasks: List existing tasks\n- tasky_update_task: Update task status or properties\n- tasky_delete_task: Delete tasks\n- tasky_create_reminder: Create reminders with message, time (relative like "in 5 minutes" or specific), days array, oneTime boolean\n- tasky_list_reminders: List existing reminders\n- tasky_update_reminder: Update reminders (message, time, days, enabled)\n- tasky_delete_reminder: Delete reminders\n\nAlways show a brief "Plan:" before calling tools. Use tools only when intent is actionable. Map "start"→IN_PROGRESS, "finish"→COMPLETED. Accept relative reminder times as one‑time reminders.';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Throttle UI updates for streamed text to improve responsiveness
  const lastFlushRef = useRef<number>(0);
  const [systemPrompt, setSystemPrompt] = useState<string>(String(settings.llmSystemPrompt || ''));
  const [useCustomPrompt, setUseCustomPrompt] = useState<boolean>(!!settings.llmUseCustomPrompt);
  const [temperature, setTemperature] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [toolEvents, setToolEvents] = useState<Array<{ id: string; phase: 'start'|'done'|'error'; name: string; args?: any; output?: string; error?: string }>>([]);
  const [pendingConfirm, setPendingConfirm] = useState<{ id: string; name: string; args: any } | null>(null);
  const [pendingResult, setPendingResult] = useState<{ id: string; name: string; args?: any; output?: string } | null>(null);
  const [loadingTools, setLoadingTools] = useState<Set<string>>(new Set());
  const [mcpReady, setMcpReady] = useState<boolean>(false);
  const [checkedMcp, setCheckedMcp] = useState<boolean>(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const lastResultIdRef = useRef<string | null>(null);
  const [allChats, setAllChats] = useState<Array<{ id: string; title: string; preview: string; timestamp: string }>>([]);
  const [showChatHistory, setShowChatHistory] = useState<boolean>(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const historyAnchorRef = useRef<HTMLDivElement | null>(null);
  const historyMenuRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [historyTop, setHistoryTop] = useState<number>(48);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  type Toast = { id: number; message: string };
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    // Auto-dismiss in 5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Create a new chat on first mount and persist transcript as it evolves
  useEffect(() => {
    // Persist Tasky policy prompt and always use it
    try {
      if (!useCustomPrompt) {
        window.electronAPI.setSetting('llmSystemPrompt' as any, TASKY_DEFAULT_PROMPT);
        setSystemPrompt(TASKY_DEFAULT_PROMPT);
      }
    } catch {}
    let mounted = true;
    (async () => {
      try {
        // Try to load the latest chat; if none, create one
        const existing = await window.electronAPI.listChats(1).catch(() => []);
        if (existing && Array.isArray(existing) && existing.length > 0) {
          const latest = existing[0];
          if (!mounted) return;
          setChatId(latest.id);
          try {
            const records = await window.electronAPI.loadChat(latest.id);
            if (!mounted) return;
            const loaded = Array.isArray(records)
              ? records.map((r: any) => ({ role: r.role, content: r.content }))
              : [];
            setMessages(loaded);
          } catch {}
        } else {
        const id = await window.electronAPI.createChat('Chat');
        if (mounted) setChatId(id);
        }
      } catch (e) {
        // ignore; chat will operate without persistence
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Build per-provider clients
  const provider = useMemo(() => (settings.llmProvider || 'openai').toLowerCase(), [settings.llmProvider]);
  const openaiModelId = useMemo(() => {
    const requested = (settings.llmModel || 'o4-mini').toString();
    const m = requested.toLowerCase();
    if (m === 'gpt-4o-mini' || m === 'gpt-5-mini') return 'o4-mini';
    if (m === 'gpt-4o' || m === 'gpt-5') return 'o4';
    if (m.startsWith('gpt-4')) return 'o4';
    return requested;
  }, [settings.llmModel]);

  const lmModelId = useMemo(() => (settings.llmModel || 'llama-3.2-1b').toString(), [settings.llmModel]);
  // Provide a fallback for custom OpenAI-compatible endpoints
  const customBaseUrl = useMemo(() => (settings.llmBaseUrl || '').toString().trim(), [settings.llmBaseUrl]);

  const openaiClient = useMemo(() => {
    const apiKey = settings.llmApiKey || '';
    return createOpenAI({ apiKey });
  }, [settings.llmApiKey]);

  const lmStudioClient = useMemo(() => {
    const baseURL = settings.llmBaseUrl || 'http://localhost:1234/v1';
    return createOpenAICompatible({ name: 'lmstudio', baseURL });
  }, [settings.llmBaseUrl]);

  const providerSupported = useMemo(() => ['openai', 'lm-studio', 'custom'].includes(provider), [provider]);

  useEffect(() => {
    const onTool = (e: any) => {
      const detail = e?.detail || {};
      setToolEvents(prev => {
        const others = prev.filter(ev => ev.id !== detail.id);
        return [...others, detail];
      });
      // Loading state for tool by id
      setLoadingTools(prev => {
        const next = new Set(prev);
        if (detail.phase === 'start') next.add(detail.id);
        if (detail.phase === 'done' || detail.phase === 'error') next.delete(detail.id);
        return next;
      });
    };
    const onToolConfirm = (e: any) => {
      const d = e?.detail || {};
      setPendingConfirm({ id: d.id, name: d.name, args: d.args });
    };
    window.addEventListener('tasky:tool', onTool as any);
    window.addEventListener('tasky:tool:confirm', onToolConfirm as any);
    return () => {
      window.removeEventListener('tasky:tool', onTool as any);
      window.removeEventListener('tasky:tool:confirm', onToolConfirm as any);
    };
  }, []);

  // Show a themed result popup when any tool completes
  useEffect(() => {
    if (!toolEvents || toolEvents.length === 0) return;
    const latestDone = [...toolEvents].reverse().find(ev => ev.phase === 'done');
    if (!latestDone) return;
    if (latestDone.id === lastResultIdRef.current) return;
    lastResultIdRef.current = latestDone.id;
    setPendingResult({ id: latestDone.id, name: latestDone.name, args: latestDone.args, output: latestDone.output });
  }, [toolEvents]);

  /**
   * MCP Health Check - Verifies connection to local MCP server
   * Only runs once to avoid unnecessary requests
   */
  const ensureMcp = async () => {
    if (checkedMcp) return;
    setCheckedMcp(true);
    try {
      // Skip MCP check in tests
      if (typeof process !== 'undefined' && (process as any).env && (((process as any).env as any).VITEST || ((process as any).env as any).NODE_ENV === 'test')) {
        setMcpReady(false);
        return;
      }
      const res = await fetch('http://localhost:7844/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/list' })
      });
      if (res.ok) setMcpReady(true);
    } catch {
      setMcpReady(false);
    }
  };
  useEffect(() => { ensureMcp(); }, []);

  // Load all chats for history dropdown
  const loadChatHistory = async () => {
    try {
      const chats = await window.electronAPI.listChats(50); // Get last 50 chats
      if (Array.isArray(chats)) {
        const chatPreviews = await Promise.all(
          chats.map(async (chat: any) => {
            try {
              const messages = await window.electronAPI.loadChat(chat.id);
              const firstUserMessage = Array.isArray(messages) 
                ? messages.find((m: any) => m.role === 'user')?.content || 'New chat'
                : 'New chat';
              
              return {
                id: chat.id,
                title: chat.title || 'Chat',
                preview: firstUserMessage.length > 50 
                  ? firstUserMessage.substring(0, 50) + '...' 
                  : firstUserMessage,
                timestamp: new Date(chat.createdAt).toLocaleDateString()
              };
            } catch {
              return {
                id: chat.id,
                title: chat.title || 'Chat',
                preview: 'Unable to load preview',
                timestamp: new Date(chat.createdAt).toLocaleDateString()
              };
            }
          })
        );
        setAllChats(chatPreviews);
      }
    } catch (error) {
      console.warn('Failed to load chat history:', error);
    }
  };

  // Load chat history when component mounts
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Ensure confirmation card is fully visible by scrolling to bottom of message list
  useEffect(() => {
    if (pendingConfirm && messagesScrollRef.current) {
      try {
        const el = messagesScrollRef.current;
        // next frame to ensure layout is measured
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      } catch {}
    }
  }, [pendingConfirm]);

  // Ensure result card is visible
  useEffect(() => {
    if (pendingResult && messagesScrollRef.current) {
      try {
        const el = messagesScrollRef.current;
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      } catch {}
    }
  }, [pendingResult]);

  // Extract JSON object/array from MCP output text
  const extractJsonFromOutput = (raw: string | undefined | null): any | null => {
    if (!raw || typeof raw !== 'string') return null;
    try { return JSON.parse(raw); } catch {}
    const firstBrace = raw.indexOf('{');
    const firstBracket = raw.indexOf('[');
    let idx = -1;
    if (firstBrace !== -1 && firstBracket !== -1) idx = Math.min(firstBrace, firstBracket);
    else idx = firstBrace !== -1 ? firstBrace : firstBracket;
    if (idx !== -1) {
      const sub = raw.slice(idx).trim();
      try { return JSON.parse(sub); } catch {}
    }
    const lines = raw.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const t = lines[i].trim();
      if (t.startsWith('{') || t.startsWith('[')) {
        try { return JSON.parse(t); } catch {}
      }
    }
    return null;
  };

  // Close chat history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showChatHistory) {
        const target = event.target as Element;
        const inAnchor = historyAnchorRef.current?.contains(target) ?? false;
        const inMenu = historyMenuRef.current?.contains(target) ?? false;
        if (!inAnchor && !inMenu) {
          setShowChatHistory(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChatHistory]);

  // Function to switch to a different chat
  const switchToChat = async (selectedChatId: string) => {
    if (selectedChatId === chatId) return; // Already on this chat
    
    try {
      const messages = await window.electronAPI.loadChat(selectedChatId);
      if (Array.isArray(messages)) {
        const loadedMessages = messages.map((m: any) => ({ 
          role: m.role, 
          content: m.content 
        }));
        setMessages(loadedMessages);
        setChatId(selectedChatId);
        setToolEvents([]); // Clear tool events for new chat
        // Keep history panel open for creation/editing/switching flows
      }
    } catch (error) {
      console.warn('Failed to switch to chat:', error);
      pushToast('Failed to load selected chat');
    }
  };

  /**
   * Enhanced message sending with AI SDK patterns
   * - Multi-step tool calls with maxSteps
   * - Tool call repair for better reliability  
   * - Stream consumption for robustness
   * - Enhanced error handling and recovery
   */
  const onSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || busy) return;
    setError(null);
    const next = [...messagesRef.current, { role: 'user', content: trimmed } as ChatMessage, { role: 'assistant', content: '' } as ChatMessage];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
              // Persist immediately after user sends so history survives even if stream fails
        try {
          if (chatId) {
            const toSave = next.map(m => ({ role: m.role, content: m.content }));
            await window.electronAPI.saveChat(chatId, toSave);
            loadChatHistory(); // Refresh chat history after saving
          }
        } catch {}
      if (!providerSupported) {
        throw new Error('Selected provider not yet supported in this chat module');
      }
      const sys = (systemPrompt || String(settings.llmSystemPrompt || '')).trim();
      const effectiveSys = useCustomPrompt && systemPrompt.trim().length > 0 ? systemPrompt.trim() : TASKY_DEFAULT_PROMPT;
      // Build role-aware messages so the system prompt is not echoed into history
      const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: effectiveSys },
        ...next.map(m => ({ role: m.role, content: m.content }))
      ];

      // Streaming response using AI SDK
      const controller = new AbortController();
      abortRef.current = controller;
      let model: any;
      if (provider === 'lm-studio') {
        model = lmStudioClient(lmModelId);
      } else if (provider === 'custom' && customBaseUrl) {
        // Reuse OpenAI-compatible client path for custom
        const customClient = createOpenAICompatible({ name: 'custom', baseURL: customBaseUrl });
        model = customClient(lmModelId);
      } else {
        model = (openaiClient as any).responses
          ? (openaiClient as any).responses(openaiModelId)
          : (openaiClient as any)(openaiModelId);
      }

      try { console.debug('[Chat] Provider/model:', provider, model, 'mcpReady=', mcpReady); } catch {}
      const options: any = {
        model,
        messages: chatMessages as any,
        temperature,
        maxRetries: 0,
        maxSteps: 5, // Enable multi-step tool calls
        abortSignal: controller.signal as any,
        
        // Enhanced callbacks for better tool integration
        onStepFinish: (params: any) => {
          const { toolCalls, toolResults } = params;
          console.log('[Chat] Step completed:', { 
            toolCallsCount: toolCalls.length, 
            toolResultsCount: toolResults.length 
          });
        },
        
        onFinish: async (params: any) => {
          const { response, usage, steps } = params;
          console.log('[Chat] Stream finished:', { 
            usage, 
            stepsCount: steps.length,
            responseLength: response.text?.length 
          });
          
          // Enhanced persistence with final response
          try {
            if (chatId) {
              const finalMessages = messagesRef.current.map(m => ({ 
                role: m.role, 
                content: m.content 
              }));
              await window.electronAPI.saveChat(chatId, finalMessages);
            }
          } catch (err) {
            console.error('[Chat] Failed to save final transcript:', err);
          }
        },

        // Tool call repair for better reliability
        experimental_repairToolCall: async (params: any) => {
          const { toolCall, error, tools } = params;
          console.warn('[Chat] Tool call repair needed:', { 
            toolName: toolCall.toolName, 
            error: error.message 
          });
          
          // Strategy 1: Skip invalid tools
          if (error.message.includes('NoSuchTool') || error.message.includes('not found')) {
            console.log('[Chat] Skipping invalid tool:', toolCall.toolName);
            return null;
          }
          
          // Strategy 2: Fix common argument issues
          if (error.message.includes('invalid') || error.message.includes('required')) {
            try {
              // Attempt to fix by ensuring required fields
              const fixedInput = {
                name: toolCall.toolName.replace('mcpCall.', ''),
                args: typeof toolCall.input === 'string' 
                  ? JSON.parse(toolCall.input) 
                  : toolCall.input?.args || {}
              };
              
              console.log('[Chat] Attempting tool repair:', fixedInput);
              return {
                ...toolCall,
                input: JSON.stringify(fixedInput)
              };
            } catch (repairErr) {
              console.error('[Chat] Tool repair failed:', repairErr);
              return null;
            }
          }
          
          // Default: skip problematic tools
          return null;
        }
      };
      
      if (mcpReady) {
        options.tools = { mcpCall };
      }
      
      const result = await streamText(options);
      
      // Enhanced streaming with better error handling and performance
      let assistantMessage = '';
      
      try {
        for await (const chunk of result.textStream) {
          if (controller.signal.aborted) {
            console.log('[Chat] Stream aborted by user');
            break;
          }
          
          assistantMessage += chunk;

          // Optimized UI updates - batch updates for better performance
          const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
          const shouldFlush = now - (lastFlushRef.current || 0) > 60 || chunk.includes('\n');
          if (shouldFlush) {
            lastFlushRef.current = now;
            setMessages(prev => {
              const copy = [...prev];
              const lastIdx = copy.length - 1;
              if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
                copy[lastIdx] = { 
                  role: 'assistant', 
                  content: assistantMessage 
                };
              }
              return copy;
            });
          }
        }
        
        // Final flush to ensure last tokens are shown
        setMessages(prev => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
            copy[lastIdx] = { role: 'assistant', content: assistantMessage };
          }
          return copy;
        });

        // Stream consumption for reliability - ensures completion even if client disconnects
        result.consumeStream?.();
        
      } catch (streamError: any) {
        console.warn('[Chat] Stream interrupted:', streamError.message);
        
        // Handle partial content gracefully
        if (assistantMessage.length > 0) {
        setMessages(prev => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
              copy[lastIdx] = { 
                role: 'assistant', 
                content: assistantMessage + ' [Stream interrupted]'
              };
          }
          return copy;
        });
        }
        
        // Re-throw if it's not an abort error
        if (!controller.signal.aborted) {
          throw streamError;
        }
      }
      // After stream completion, persist transcript if we have a chatId
      try {
        if (chatId) {
          const toSave = messagesRef.current.map(m => ({ role: m.role, content: m.content }));
          await window.electronAPI.saveChat(chatId, toSave);
        }
      } catch {}
    } catch (e: any) {
      try { console.error('[Chat] Error during stream:', e); } catch {}
      const msg = e?.message || 'Chat request failed';
      setError(msg);
      pushToast(msg);
      // Best-effort save current transcript on error
      try {
        if (chatId) {
          const toSave = messagesRef.current.map(m => ({ role: m.role, content: m.content }));
          await window.electronAPI.saveChat(chatId, toSave);
        }
      } catch {}
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const onStop = () => {
    try { abortRef.current?.abort(); } catch {}
  };

  return (
    <div ref={rootRef} className="flex-1 min-h-0 flex flex-col relative">
      <div className="flex-1 min-h-0 flex flex-col relative w-full">
        {/* Header row: keep non-sticky to avoid overlay collision */}
          <div ref={headerRef} className="flex-shrink-0 flex items-center justify-between mb-2 px-1">
            <div className="text-base font-semibold flex items-center gap-2"></div>
            <div className="flex items-center gap-2 overflow-visible" style={{WebkitAppRegion:'no-drag'}}>
              {/* Chat History Dropdown */}
              <div className="relative inline-block chat-history-dropdown" ref={historyAnchorRef}>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs px-3 flex items-center gap-2 border border-border/30 bg-background text-foreground hover:bg-muted"
                  disabled={busy}
                  onClick={() => {
                    const nextOpen = !showChatHistory;
                    setShowChatHistory(nextOpen);
                    if (nextOpen) {
                      try {
                        const hh = headerRef.current?.getBoundingClientRect().height || 48;
                        setHistoryTop(hh + 6);
                      } catch {}
                      loadChatHistory(); // Refresh when opening
                    }
                  }}
                >
                  <span>📋</span>
                  History
                  <span className={`transition-transform ${showChatHistory ? 'rotate-180' : ''}`}>▼</span>
                </Button>
                
                {/* Dropdown Menu */}
                {showChatHistory && createPortal(
                  <motion.div
                    ref={historyMenuRef}
                    className="absolute inset-x-0 bottom-0 z-50"
                    style={{ top: historyTop }}
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mx-2 rounded-xl border border-border/30 bg-card text-foreground shadow-xl h-full overflow-hidden">
                      <div className="p-3 border-b border-border/30 flex items-center justify-between">
                        <h3 className="font-semibold">Chat History</h3>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 rounded-md text-xs"
                            onClick={async ()=>{
                              try {
                                const id = await window.electronAPI.createChat('Chat');
                                await loadChatHistory();
                                switchToChat(id);
                              } catch {}
                            }}
                          >+ New</Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-full hover:bg-muted" onClick={()=>setShowChatHistory(false)}>✕</Button>
                        </div>
                      </div>
                      <div className="h-[calc(100%-48px)] overflow-y-auto p-2">
                        {allChats.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground text-sm">No chat history found</div>
                        ) : (
                          <div className="space-y-2">
                            {allChats.map((chat) => (
                              <div key={chat.id} className={`p-3 rounded-lg border transition-colors ${chat.id===chatId?'bg-primary/5 border-primary/30':'border-border/30 hover:bg-muted'}`}
                                   onClick={() => switchToChat(chat.id)}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    {renameId === chat.id ? (
                                      <div className="flex items-center gap-2">
                                        <input className="bg-background border border-border/30 rounded px-2 py-1 text-sm w-full"
                                               value={renameValue}
                                               onClick={(e)=>e.stopPropagation()}
                                               onChange={(e)=>setRenameValue(e.target.value)} />
                                        <Button size="sm" className="h-7 px-2 text-xs" onClick={async (e)=>{
                                          e.stopPropagation();
                                          if (!renameValue.trim()) { setRenameId(null); return; }
                                          try {
                                            const msgs = await window.electronAPI.loadChat(chat.id).catch(()=>[]);
                                            const newId = await window.electronAPI.createChat(renameValue.trim());
                                            if (Array.isArray(msgs)) await window.electronAPI.saveChat(newId, msgs);
                                            await window.electronAPI.deleteChat(chat.id);
                                            await loadChatHistory();
                                            switchToChat(newId);
                                          } catch {}
                                          setRenameId(null);
                                        }}>Save</Button>
                                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={(e)=>{e.stopPropagation(); setRenameId(null);}}>Cancel</Button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="font-medium truncate">{chat.title}</div>
                                        <div className="text-xs text-muted-foreground mt-1">{chat.timestamp}</div>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    {chat.id === chatId && (<div className="text-primary text-xs font-medium">Current</div>)}
                                    {renameId !== chat.id && (
                                      <>
                                        <Button size="sm" variant="outline" className="h-6 px-2 rounded-md text-xs" onClick={(e)=>{e.stopPropagation(); setRenameId(chat.id); setRenameValue(chat.title || '');}}>Rename</Button>
                                        <Button size="sm" variant="outline" className="h-6 px-2 rounded-md text-xs text-red-600 border-red-300 hover:bg-red-50" onClick={(e)=>{e.stopPropagation(); setPendingConfirm({ id: `delete-${chat.id}`, name: 'delete_chat', args: { id: chat.id } });}}>Delete</Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>,
                  rootRef.current ?? document.body
                )}
              </div>
              
              {/* Provider selector (OpenAI / LM Studio) */}
              <select
                value={String(settings.llmProvider || 'openai')}
                onChange={(e) => onSettingChange && onSettingChange('llmProvider', e.target.value)}
                className="bg-card text-foreground border border-border/30 rounded-md text-xs h-7 w-auto min-w-fit pl-2 pr-10"
              >
                <option value="openai">OpenAI</option>
                <option value="lm-studio">LM Studio</option>
              </select>
              {/* Model selector */}
              {String(settings.llmProvider || 'openai') === 'openai' ? (
                <select
                  value={String(settings.llmModel || 'o4-mini')}
                  onChange={(e) => onSettingChange && onSettingChange('llmModel', e.target.value)}
                  className="bg-card text-foreground border border-border/30 rounded-md text-xs h-7 w-auto min-w-fit pl-2 pr-10"
                >
                  <option value="o4-mini">o4-mini</option>
                  <option value="o4">o4</option>
                </select>
              ) : (
                <input
                  value={String(settings.llmModel || 'llama-3.2-1b')}
                  onChange={(e) => onSettingChange && onSettingChange('llmModel', e.target.value)}
                  className="bg-card text-foreground border border-border/30 rounded-md px-2 py-1 text-xs h-7 w-auto min-w-[160px]"
                  placeholder="llama-3.2-1b"
                />
              )}
              <Button size="icon" variant="outline" aria-label="Chat settings" className="rounded-xl" onClick={() => setShowSettings(true)}>
                <Cog className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {!providerSupported && (
            <div className="text-xs text-yellow-400 mb-2">Provider not yet supported here. Please select OpenAI, LM Studio, or Custom in Settings.</div>
          )}
          {/* Message bubble container (hidden when settings open) */}
          <div className={`flex-1 w-full rounded-2xl border border-border/30 p-2 flex flex-col min-h-[calc(100vh-220px)] max-h-[calc(100vh-220px)] ${showSettings ? 'hidden' : 'bg-background/60'}`}>
            <div ref={messagesScrollRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2 w-full">
            {messages.length === 0 ? (
              <></>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`max-w-full ${m.role === 'user' ? 'ml-auto' : ''} flex`}
                  >
                    <div className={`${m.role === 'user'
                        ? 'border border-border/30 bg-primary/5'
                        : 'bg-card border border-border/30'} text-foreground rounded-2xl px-4 py-3 shadow-lg w-full whitespace-pre-wrap break-words`}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Inline tool event cards positioned above the composer within the scroll area */}
            {toolEvents.length > 0 && (
              <div className="space-y-3 mt-3">
                {toolEvents.map(ev => (
                  <motion.div 
                    key={ev.id} 
                    className="bg-card rounded-xl border border-border/30 p-4 shadow-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        ev.phase === 'done' ? 'bg-primary/10 text-primary' :
                        ev.phase === 'error' ? 'bg-destructive/10 text-destructive' :
                        'bg-muted text-foreground'
                      }`}>
                        {loadingTools.has(ev.id) ? (
                           <div className="flex gap-0.5">
                             <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                             <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                             <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                           </div>
                         ) : null}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          {ev.name.replace('tasky_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {loadingTools.has(ev.id) && 'Executing...'}
                          {ev.phase === 'done' && 'Completed successfully'}
                          {ev.phase === 'error' && `Error: ${ev.error}`}
                          {!loadingTools.has(ev.id) && ev.phase !== 'done' && ev.phase !== 'error' && 'Ready'}
                        </div>
                      </div>
                      
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ev.phase === 'done' ? 'bg-primary/10 text-primary' :
                        ev.phase === 'error' ? 'bg-destructive/10 text-destructive' :
                        'bg-muted text-foreground'
                      }`}>
                        {ev.phase}
                      </div>
                    </div>
                    
                    {ev.output && ev.phase === 'done' && (
                      <div className="mt-3 p-3 bg-muted rounded-lg border border-border/30">
                        <div className="text-sm text-foreground whitespace-pre-wrap break-words">{ev.output}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
            </div>
          </div>
          {/* Confirmations/results shown as overlays */}
          {(pendingConfirm || pendingResult) && (
            <div className="mt-2 space-y-2">
              {pendingConfirm && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setPendingConfirm(null)} />
                  <motion.div 
                    className="relative bg-card text-foreground rounded-2xl shadow-2xl border border-border/30 p-6 w-[min(640px,90vw)] max-h-[80vh] overflow-y-auto"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6 rounded-xl p-4 text-card-foreground bg-card border border-border/30">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary font-semibold">{pendingConfirm.name.includes('delete') ? 'Delete' : 'Confirm'}</div>
                    <div>
                      <h3 className="font-semibold text-lg">Confirm Action</h3>
                      <p className="text-sm text-muted-foreground">Review the details before proceeding</p>
                    </div>
                  </div>
                  
                  {/* Content preview with better styling */}
                   <div className="bg-muted rounded-xl p-4 mb-6 border border-border/30">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{pendingConfirm.name}</div>
                    
                    {/* Enhanced structured rendering */}
                    <div className="text-sm space-y-2">
                      {(() => {
                        const args = pendingConfirm.args;
                        
                        // Enhanced reminder preview
                        if (pendingConfirm.name.includes('reminder')) {
                          const title = args?.title || args?.message || 'Reminder';
                          const time = args?.time?.relative || args?.time || 'unspecified time';
                          const days = Array.isArray(args?.days) && args.days.length > 0 ? args.days : null;
                          const oneTime = args?.oneTime;
                          
                          return (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-semibold">Reminder</div>
                                <div>
                                  <div className="font-semibold text-gray-900">{String(title)}</div>
                                  <div className="text-sm text-gray-600">Reminder</div>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-3 pl-2">
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                     <span className="text-primary">Time</span>
                                  <div>
                                    <div className="font-medium text-gray-900">{typeof time === 'string' ? time : JSON.stringify(time)}</div>
                                    <div className="text-xs text-gray-500">Scheduled time</div>
                                  </div>
                                </div>
                                {days && (
                                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                     <span className="text-primary">Days</span>
                                    <div>
                                      <div className="font-medium text-gray-900">{days.join(', ')}</div>
                                      <div className="text-xs text-gray-500">Repeat days</div>
                                    </div>
                                  </div>
                                )}
                                {oneTime && (
                                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <span className="text-amber-600">🔔</span>
                                    <div>
                                      <div className="font-medium text-amber-900">One-time reminder</div>
                                      <div className="text-xs text-amber-600">Will not repeat</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        
                        // Enhanced task preview
                        if (pendingConfirm.name.includes('task')) {
                          const title = args?.title;
                          const description = args?.description;
                          const dueDate = args?.dueDate;
                          const tags = Array.isArray(args?.tags) ? args.tags : null;
                          const status = args?.status;
                          const id = args?.id;
                          
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                 <span className="text-primary font-semibold">Task</span>
                                <span className="font-medium text-gray-900">{title ? String(title) : 'Task'}</span>
                              </div>
                              <div className="pl-7 space-y-1 text-sm text-gray-700">
                                {description && (
                                  <div className="flex items-start gap-2">
                                     <span className="text-muted-foreground mt-0.5">Description</span>
                                    <span>{String(description)}</span>
                                  </div>
                                )}
                                {dueDate && (
                                  <div className="flex items-center gap-2">
                                     <span className="text-primary">Due</span>
                                    <span>{String(dueDate)}</span>
                                  </div>
                                )}
                                {tags && tags.length > 0 && (
                                  <div className="flex items-center gap-2">
                                     <span className="text-primary">Tags</span>
                                    <div className="flex gap-1 flex-wrap">
                                      {tags.map((tag: string, i: number) => (
                                        <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                          {String(tag)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {status && (
                                  <div className="flex items-center gap-2">
                                     <span className="text-primary">Status</span>
                                    <span className="capitalize">{String(status).replace('_', ' ')}</span>
                                  </div>
                                )}
                                {id && (
                                  <div className="flex items-center gap-2">
                                     <span className="text-muted-foreground">ID</span>
                                    <span className="text-xs font-mono text-gray-500">ID: {String(id)}</span>
              </div>
            )}
            </div>
          </div>
                          );
                        }
                        
                        // Enhanced delete operations
                        if (pendingConfirm.name.includes('delete')) {
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg text-red-500">🗑️</span>
                                <span className="font-medium text-red-900">Delete {pendingConfirm.name.includes('chat') ? 'Chat' : pendingConfirm.name.includes('task') ? 'Task' : 'Reminder'}</span>
                              </div>
                              <div className="pl-7 text-sm text-red-700">
                                <div className="bg-red-50 border border-red-200 rounded p-2">
                                  <div className="font-medium">⚠️ This action cannot be undone</div>
                                  {args?.id && <div className="text-xs mt-1">ID: {String(args.id)}</div>}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // JSON fallback with better formatting
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">⚙️</span>
                              <span className="font-medium text-gray-900">Tool Arguments</span>
                            </div>
                            <div className="pl-7">
                              <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap break-words">
                                {JSON.stringify(args, null, 2)}
                              </pre>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Enhanced action buttons */}
                  <div className="flex gap-3 mt-4">
                    <Button 
                      size="lg"
                      variant="outline" 
                      className="flex-1 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium py-3" 
                      onClick={() => {
                        if (pendingConfirm.name === 'delete_chat') {
                          setPendingConfirm(null);
                          return;
                        }
                        try { 
                          window.dispatchEvent(new CustomEvent('tasky:tool:confirm:response', { 
                            detail: { id: pendingConfirm.id, accepted: false } 
                          })); 
                        } catch {}
                        setPendingConfirm(null);
                      }}
                    >
                      <span className="mr-2">✗</span>
                      Cancel
                    </Button>
                    <Button 
                      size="lg"
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium py-3" 
                      onClick={async () => {
                        if (pendingConfirm.name === 'delete_chat') {
                          try {
                            const idToDelete = pendingConfirm.args?.id;
                            if (idToDelete) {
                              await window.electronAPI.deleteChat(idToDelete);
                              const updatedList = await window.electronAPI.listChats(50).catch(() => []);
                              await loadChatHistory();
                              if (idToDelete === chatId) {
                                if (Array.isArray(updatedList) && updatedList.length > 0) {
                                  const nextChat = updatedList[0];
                                  await switchToChat(nextChat.id);
                                } else {
                                  const newId = await window.electronAPI.createChat('Chat');
                                  setChatId(newId);
                                  setMessages([]);
                                  setToolEvents([]);
                                }
                              }
                            }
                          } catch {}
                          setPendingConfirm(null);
                          return;
                        }
                        try { 
                          window.dispatchEvent(new CustomEvent('tasky:tool:confirm:response', { 
                            detail: { id: pendingConfirm.id, accepted: true } 
                          })); 
                        } catch {}
                        setPendingConfirm(null);
                      }}
                    >
                      <span className="mr-2">✓</span>
                      Confirm
                    </Button>
                  </div>
                  </motion.div>
                </div>, rootRef.current ?? document.body
                  )}
              {pendingResult && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setPendingResult(null)} />
                  <motion.div 
                    className="relative bg-card text-foreground rounded-2xl shadow-2xl border border-border/30 p-6 w-[min(640px,90vw)] max-h-[80vh] overflow-y-auto"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6 rounded-xl p-4 text-card-foreground bg-card border border-border/30">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary font-semibold">
                        {pendingResult.name.includes('task') ? 'Task' : pendingResult.name.includes('reminder') ? 'Reminder' : 'Result'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Completed successfully</h3>
                        <p className="text-sm text-muted-foreground">{pendingResult.name}</p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="bg-muted rounded-xl p-4 mb-6 border border-border/30">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Details</div>
                      <div className="text-sm space-y-2">
                        {(() => {
                          const args = pendingResult.args || {};
                          if (pendingResult.name.includes('reminder')) {
                            const message = args?.message || 'Reminder';
                            const time = args?.time || 'unspecified time';
                            const days = Array.isArray(args?.days) ? args.days : [];
                            return (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">🔔</span>
                                  <span className="font-medium">{String(message)}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-3 pl-1">
                                  <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border/30">
                                    <span className="text-primary">Time</span>
                                    <div>
                                      <div className="font-medium">{String(time)}</div>
                                      <div className="text-xs text-muted-foreground">Scheduled time</div>
                                    </div>
                                  </div>
                                  {days.length > 0 && (
                                    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border/30">
                                      <span className="text-primary">Days</span>
                                      <div>
                                        <div className="font-medium">{days.join(', ')}</div>
                                        <div className="text-xs text-muted-foreground">Repeat days</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          // Task and other tools: try to parse JSON output
                          const parsed = extractJsonFromOutput(pendingResult.output);
                          if (parsed && parsed.schema && parsed.schema.title) {
                            const t = parsed;
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-primary font-semibold">Task</span>
                                  <span className="font-medium">{String(t.schema.title)}</span>
                                </div>
                                <div className="pl-1 space-y-2">
                                  {t.schema.description && (
                                    <div className="text-sm text-muted-foreground">{String(t.schema.description)}</div>
                                  )}
                                  <div className="text-xs text-muted-foreground">ID: {String(t.schema.id)}</div>
                                  {Array.isArray(t.schema.tags) && t.schema.tags.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {t.schema.tags.map((tag: string, i: number) => (
                                        <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{String(tag)}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <pre className="text-xs bg-card border border-border/30 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap break-words">{pendingResult.output || ''}</pre>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-2">
                      <Button 
                        size="lg"
                        className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-200 font-medium py-3" 
                        onClick={() => setPendingResult(null)}
                      >
                        Done
                      </Button>
                    </div>
                  </motion.div>
                </div>, rootRef.current ?? document.body
              )}
            </div>
          )}
          {/* inline error removed; using toast */}
      </div>

      {/* Composer pinned to bottom of application */}
      <form className={`mt-2 flex items-center gap-2 flex-shrink-0 w-full ${showSettings ? 'hidden' : ''}`}
            onSubmit={(e) => { e.preventDefault(); onSend(); }}>
        <Label className="sr-only">Message</Label>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-2xl focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
        {!busy ? (
          <Button type="submit" disabled={!input.trim()} className="rounded-2xl">
            Send
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={onStop} className="rounded-2xl flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
            Stop
          </Button>
        )}
      </form>

      <Modal
        open={showSettings}
        title="Chat Settings"
        onClose={() => setShowSettings(false)}
        maxWidth={560}
        fullHeight
        tone="background"
        backdropClass="bg-black/60"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs font-semibold">System Prompt</div>
            <textarea
              className="w-full min-h-[160px] bg-card text-card-foreground border border-border/40 rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <div className="text-[11px] text-muted-foreground">Choose whether to use your custom prompt or Tasky’s default.
            </div>
            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={useCustomPrompt} onChange={(e)=>{
                  const v = e.target.checked;
                  setUseCustomPrompt(v);
                  try { window.electronAPI.setSetting('llmUseCustomPrompt' as any, v); } catch {}
                  if (!v) {
                    setSystemPrompt(TASKY_DEFAULT_PROMPT);
                    try { window.electronAPI.setSetting('llmSystemPrompt' as any, TASKY_DEFAULT_PROMPT); } catch {}
                  }
                }} />
                Use custom prompt
              </label>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={()=>{
                setSystemPrompt(TASKY_DEFAULT_PROMPT);
                try { window.electronAPI.setSetting('llmSystemPrompt' as any, TASKY_DEFAULT_PROMPT); } catch {}
              }}>Reset to Tasky default</Button>
              <Button size="sm" className="rounded-lg" onClick={()=>{
                try { window.electronAPI.setSetting('llmSystemPrompt' as any, systemPrompt || ''); } catch {}
              }}>Save</Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold">Temperature</div>
              <div className="text-xs text-muted-foreground">{temperature.toFixed(2)}</div>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-[11px] text-muted-foreground">Lower = more focused, Higher = more creative.</div>
          </div>
        </div>
      </Modal>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed right-3 bottom-16 z-50 space-y-2">
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/30 rounded-xl shadow-2xl px-3 py-2 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <span className="text-foreground/90">{t.message}</span>
              <Button size="sm" variant="outline" className="ml-2 rounded-lg px-2 py-0.5 text-xs" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}>Close</Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};


