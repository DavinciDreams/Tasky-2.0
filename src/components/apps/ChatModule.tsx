import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// UI Components
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';

// Chat Components
import {
  ChatHeader,
  MessageContainer,
  ChatComposer,
  ConfirmOverlay,
  ChatToasts,
  useMcpTools,
  useScroll,
  useChatPersistence,
} from '../chat';

// Types and Tools
import type { Settings as AppSettings } from '../../types';
import type { ChatMessage, Toast } from '../chat/types';
import { mcpCall } from '../../ai/mcp-tools';

interface ChatModuleProps {
  settings: AppSettings;
  onSettingChange?: (key: keyof AppSettings, value: any) => void;
}

/**
 * Refactored Chat Module with modular components and theme integration
 */
export const ChatModule: React.FC<ChatModuleProps> = ({ settings, onSettingChange }) => {
  const TASKY_DEFAULT_PROMPT = `You are Tasky, the in‑app assistant for Tasky. Stay concise, helpful, and focused on Tasky features: general conversation/ideation plus managing Tasks and Reminders.

When users want to create, list, update, delete, or execute tasks or reminders, use the mcpCall tool with the appropriate MCP tool name and arguments:

TASK TOOLS (use mcpCall with these tool names):
- tasky_create_task: Create tasks with title, description, dueDate, tags, etc.
  * IMPORTANT: Extract title and description from user's natural language
  * Example: "Create task called demo with description hello" → mcpCall({name: "tasky_create_task", args: {title: "demo", description: "hello"}})
- tasky_list_tasks: List existing tasks with optional filtering
- tasky_update_task: Update task status or properties
  * Use task ID or you can try the task title/name as the id parameter
- tasky_delete_task: Delete tasks by ID
- tasky_execute_task: Execute a task (start or complete it)

REMINDER TOOLS (use mcpCall with these tool names):
- tasky_create_reminder: Create reminders with message, time, days array, oneTime boolean
  * For relative times like "in 10 minutes", set oneTime: true and days: ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
  * Example: "Remind me to call mom in 10 minutes" → mcpCall({name: "tasky_create_reminder", args: {message: "call mom", time: "in 10 minutes", days: ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"], oneTime: true}})
- tasky_list_reminders: List existing reminders
- tasky_update_reminder: Update reminders (message, time, days, enabled)
  * IMPORTANT: You can use either the reminder ID OR the reminder message as the "id" parameter
  * Example: "update reminder test to test 123" → mcpCall({name: "tasky_update_reminder", args: {id: "test", message: "test 123"}})
- tasky_delete_reminder: Delete reminders by ID or message

CRITICAL: Always extract parameters properly from natural language requests. Parse titles, descriptions, times, and other details accurately from what the user says. Use mcpCall with the appropriate tool name and arguments.

Always show a brief "Plan:" before calling tools. Use tools only when intent is actionable. Map "start"→IN_PROGRESS, "finish"→COMPLETED.`;

  // State
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>(String(settings.llmSystemPrompt || ''));
  const [useCustomPrompt, setUseCustomPrompt] = useState<boolean>(!!settings.llmUseCustomPrompt);
  const [temperature, setTemperature] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [mcpReady, setMcpReady] = useState<boolean>(false);
  const [checkedMcp, setCheckedMcp] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [streamingAssistantMessage, setStreamingAssistantMessage] = useState<string>('');

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const lastFlushRef = useRef<number>(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Custom hooks
  const { chatId, messages, setMessages, saveMessages, switchToChat, createNewChat } = useChatPersistence();
  const {
    toolEvents,
    pendingConfirm,
    pendingResult,
    loadingTools,
    handleConfirm,
    createConfirmSnapshot,
    createResultSnapshot,
    clearResult,
  } = useMcpTools(chatId);
  const {
    scrollRef,
    showJumpToLatest,
    scrollToBottom,
    handleScroll,
    autoScrollIfNeeded,
  } = useScroll();

  // Update messages ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Toast helper
  const pushToast = useCallback((message: string, type?: Toast['type']) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persist system prompt on mount
  useEffect(() => {
    try {
      if (!useCustomPrompt) {
        window.electronAPI.setSetting('llmSystemPrompt' as any, TASKY_DEFAULT_PROMPT);
        setSystemPrompt(TASKY_DEFAULT_PROMPT);
      }
    } catch {}
  }, [useCustomPrompt]);

  // MCP health check
  const ensureMcp = async () => {
    if (checkedMcp) return;
    setCheckedMcp(true);
    try {
      if (typeof process !== 'undefined' && (process as any).env && 
          (((process as any).env as any).VITEST || ((process as any).env as any).NODE_ENV === 'test')) {
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

  useEffect(() => {
    ensureMcp();
  }, []);

  // Build provider clients
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

  // Persist confirm/result snapshots
  useEffect(() => {
    const snapshot = createConfirmSnapshot();
    if (snapshot && chatId) {
      setMessages(prev => [...prev, snapshot]);
      saveMessages([...messagesRef.current, snapshot]);
    }
  }, [pendingConfirm, chatId]);

  useEffect(() => {
    const snapshot = createResultSnapshot();
    if (snapshot && chatId) {
      setMessages(prev => [...prev, snapshot]);
      saveMessages([...messagesRef.current, snapshot]);
      clearResult();
      autoScrollIfNeeded();
    }
  }, [pendingResult?.id]);

  // Handle chat switching
  const handleChatSwitch = useCallback(async (newChatId: string) => {
    await switchToChat(newChatId);
    // Clear tool events when switching chats
    // Note: toolEvents is managed by useMcpTools hook, would need to expose a clear method
  }, [switchToChat]);

  // Handle new chat
  const handleNewChat = useCallback(async () => {
    await createNewChat();
    // Clear tool events for new chat
  }, [createNewChat]);

  // Handle confirmation
  const handleConfirmWithChatDelete = useCallback(async (accepted: boolean) => {
    const chatToDelete = handleConfirm(accepted);
    if (chatToDelete && pendingConfirm?.name === 'delete_chat') {
      // Handle chat deletion
      try {
        await window.electronAPI.deleteChat(chatToDelete);
        const updatedList = await window.electronAPI.listChats(50).catch(() => []);
        if (chatToDelete === chatId) {
          if (Array.isArray(updatedList) && updatedList.length > 0) {
            await handleChatSwitch(updatedList[0].id);
          } else {
            await handleNewChat();
          }
        }
      } catch (error) {
        pushToast('Failed to delete chat', 'error');
      }
    }
  }, [handleConfirm, pendingConfirm, chatId, handleChatSwitch, handleNewChat, pushToast]);

  // Send message
  const onSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || busy) return;
    
    setError(null);
    const next = [...messagesRef.current, { role: 'user', content: trimmed } as ChatMessage];
    setMessages(next);
    setInput('');
    setBusy(true);
    requestAnimationFrame(scrollToBottom);

    try {
      // Ensure a chat exists and persist immediately (direct save to avoid stale closures)
      let effectiveChatId: string | null = chatId;
      const toSave = next.map(m => ({ role: m.role, content: m.content }));
      try {
        if (!effectiveChatId) {
          const createdId = await window.electronAPI.createChat('Chat') as string;
          effectiveChatId = createdId;
          await window.electronAPI.saveChat(createdId, toSave);
          await switchToChat(createdId);
        } else {
          await window.electronAPI.saveChat(effectiveChatId, toSave);
        }
      } catch {}

      if (!providerSupported) {
        throw new Error('Selected provider not yet supported in this chat module');
      }

      const effectiveSys = useCustomPrompt && systemPrompt.trim().length > 0 
        ? systemPrompt.trim() 
        : TASKY_DEFAULT_PROMPT;

      const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: effectiveSys },
        ...next.map(m => ({ role: m.role, content: m.content }))
      ];

      // Setup model
      const controller = new AbortController();
      abortRef.current = controller;
      
      let model: any;
      if (provider === 'lm-studio') {
        model = lmStudioClient(lmModelId);
      } else if (provider === 'custom' && customBaseUrl) {
        const customClient = createOpenAICompatible({ name: 'custom', baseURL: customBaseUrl });
        model = customClient(lmModelId);
      } else {
        model = (openaiClient as any).responses
          ? (openaiClient as any).responses(openaiModelId)
          : (openaiClient as any)(openaiModelId);
      }

      const options: any = {
        model,
        messages: chatMessages as any,
        temperature,
        maxRetries: 0,
        maxSteps: 5,
        abortSignal: controller.signal as any,
        
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
          
          try {
            // Ensure we save the complete conversation including tool calls
            if (chatId) {
              const currentMessages = messagesRef.current;
              if (response.text) {
                const finalMessages = [...currentMessages, { role: 'assistant', content: response.text }];
                await window.electronAPI.saveChat(chatId, finalMessages.map(m => ({
                  role: m.role,
                  content: m.content
                })));
              } else {
                await saveMessages();
              }
            }
          } catch (err) {
            console.error('[Chat] Failed to save final transcript:', err);
          }
        },

        experimental_repairToolCall: async (params: any) => {
          const { toolCall, error } = params;
          console.warn('[Chat] Tool call repair needed:', {
            toolName: toolCall.toolName,
            error: error.message
          });
          
          if (error.message.includes('NoSuchTool') || error.message.includes('not found')) {
            console.log('[Chat] Skipping invalid tool:', toolCall.toolName);
            return null;
          }
          
          if (error.message.includes('invalid') || error.message.includes('required')) {
            try {
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
          
          return null;
        }
      };
      
      if (mcpReady) {
        options.tools = {
          mcpCall
        };
      }
      
      const result = await streamText(options);
      
      // Stream response
      let assistantMessage = '';
      let streamStarted = false;
      setStreamingAssistantMessage(''); // Reset streaming content
      
      try {
        for await (const chunk of result.textStream) {
          if (controller.signal.aborted) {
            console.log('[Chat] Stream aborted by user');
            break;
          }
          
          assistantMessage += chunk;
          setStreamingAssistantMessage(assistantMessage);

          const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
          const shouldFlush = now - (lastFlushRef.current || 0) > 60 || chunk.includes('\n');
          
          if (shouldFlush) {
            lastFlushRef.current = now;
            
            // Only add the message once at the start
            if (!streamStarted) {
              setMessages(prev => [...prev, { role: 'assistant', content: '' } as ChatMessage]);
              streamStarted = true;
            }
            
            autoScrollIfNeeded();
          }
        }
        
        // Final update - set the complete message
        setStreamingAssistantMessage(''); // Clear streaming state
        setMessages(prev => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (streamStarted && lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
            copy[lastIdx] = { role: 'assistant', content: assistantMessage } as ChatMessage;
          } else {
            copy.push({ role: 'assistant', content: assistantMessage } as ChatMessage);
          }
          return copy;
        });
        autoScrollIfNeeded();

        result.consumeStream?.();
        
      } catch (streamError: any) {
        console.warn('[Chat] Stream interrupted:', streamError.message);
        setStreamingAssistantMessage(''); // Clear streaming state on error
        
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
        
        if (!controller.signal.aborted) {
          throw streamError;
        }
      }
      
      // Save final transcript with current messages state
      if (chatId) {
        const currentMessages = messagesRef.current;
        await window.electronAPI.saveChat(chatId, currentMessages.map(m => ({
          role: m.role,
          content: m.content
        })));
      }
      
    } catch (e: any) {
      console.error('[Chat] Error during stream:', e);
      const msg = e?.message || 'Chat request failed';
      setError(msg);
      pushToast(msg, 'error');
      
      if (chatId) {
        await saveMessages();
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setStreamingAssistantMessage(''); // Ensure streaming state is cleared
    }
  };

  const onStop = () => {
    try {
      abortRef.current?.abort();
    } catch {}
  };

  return (
    <div ref={rootRef} className="flex-1 min-h-0 flex flex-col relative">
      <div className="flex-1 min-h-0 flex flex-col relative w-full">
        {/* Header */}
        <ChatHeader
          settings={settings}
          onSettingChange={onSettingChange}
          onSettingsClick={() => setShowSettings(true)}
          chatId={chatId}
          onChatSwitch={handleChatSwitch}
          onNewChat={handleNewChat}
          busy={busy}
          rootRef={rootRef}
        />

        {!providerSupported && (
          <div className="text-xs text-accent mb-2">
            Provider not yet supported here. Please select OpenAI, LM Studio, or Custom in Settings.
          </div>
        )}

        {/* Message container with animated background */}
        <div className={`flex-1 w-full rounded-2xl border border-border/30 p-2 flex flex-col min-h-[calc(100vh-280px)] max-h-[calc(100vh-280px)] relative overflow-hidden ${
          showSettings ? 'hidden' : 'bg-gray-800/95'
        }`}>
          {/* Animated background layers */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800/50 via-gray-900/60 to-gray-800/40" />
            
            {/* Thinking animation when AI is responding */}
            {busy && (
              <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-500/5 via-purple-500/8 to-blue-500/5 animate-pulse" />
                <div className="absolute top-0 left-0 w-full h-full">
                  <div className="w-32 h-32 bg-gradient-radial from-blue-400/10 to-transparent rounded-full animate-ping absolute top-1/4 left-1/4" />
                  <div className="w-24 h-24 bg-gradient-radial from-purple-400/15 to-transparent rounded-full animate-ping absolute top-1/2 right-1/3 animation-delay-1000" />
                  <div className="w-20 h-20 bg-gradient-radial from-indigo-400/12 to-transparent rounded-full animate-ping absolute bottom-1/3 left-1/2 animation-delay-2000" />
                </div>
              </div>
            )}
            
            {/* Typing animation when user is typing */}
            {input.length > 0 && !busy && (
              <div className="absolute inset-0">
                <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-green-500/5 via-emerald-500/3 to-transparent" />
                <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-radial from-green-400/20 to-transparent rounded-full animate-pulse" />
              </div>
            )}
            
            {/* Subtle particle effect */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute w-1 h-1 bg-white/20 rounded-full animate-float-1" style={{top: '20%', left: '10%'}} />
              <div className="absolute w-1 h-1 bg-white/15 rounded-full animate-float-2" style={{top: '60%', left: '80%'}} />
              <div className="absolute w-1 h-1 bg-white/25 rounded-full animate-float-3" style={{top: '40%', left: '60%'}} />
              <div className="absolute w-1 h-1 bg-white/10 rounded-full animate-float-1" style={{top: '80%', left: '30%'}} />
            </div>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2 w-full relative"
            onScroll={handleScroll}
          >
            {/* Use the new MessageContainer for proper ordering */}
            <MessageContainer
              messages={messages}
              toolEvents={toolEvents}
              pendingConfirm={pendingConfirm}
              isStreaming={busy}
              streamingContent={streamingAssistantMessage}
            />

            {/* Jump to latest button */}
            {showJumpToLatest && (
              <div className="absolute bottom-2 right-2 z-10">
                <Button
                  size="sm"
                  className="rounded-full px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                  onClick={() => {
                    scrollToBottom();
                  }}
                >
                  Jump to latest
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation overlay */}
        <ConfirmOverlay
          pendingConfirm={pendingConfirm}
          onConfirm={handleConfirmWithChatDelete}
          rootRef={rootRef}
        />
      </div>

      {/* Composer with proper spacing */}
      {!showSettings && (
        <div className="px-3 pb-3 pt-2">
          <ChatComposer
            input={input}
            setInput={setInput}
            onSend={onSend}
            onStop={onStop}
            busy={busy}
          />
        </div>
      )}

      {/* Settings Modal */}
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
            <div className="text-sm font-medium text-foreground">System Prompt</div>
            <textarea
              className="w-full min-h-[160px] bg-background text-foreground border border-border/30 rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground hover:border-border/60 focus:border-primary/50 transition-colors resize-none shadow"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter your custom system prompt..."
            />
            <div className="text-[11px] text-muted-foreground">
              Choose whether to use your custom prompt or Tasky's default.
            </div>
            <div className="space-y-3 mt-3">
              <label className="text-sm flex items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={useCustomPrompt}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setUseCustomPrompt(v);
                    try {
                      window.electronAPI.setSetting('llmUseCustomPrompt' as any, v);
                    } catch {}
                    if (!v) {
                      setSystemPrompt(TASKY_DEFAULT_PROMPT);
                      try {
                        window.electronAPI.setSetting('llmSystemPrompt' as any, TASKY_DEFAULT_PROMPT);
                      } catch {}
                    }
                  }}
                />
                Use custom prompt
              </label>
              
              <div className="flex gap-3">
                <Button
                  size="sm"
                  className="rounded-xl bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
                  onClick={() => {
                    setSystemPrompt(TASKY_DEFAULT_PROMPT);
                    try {
                      window.electronAPI.setSetting('llmSystemPrompt' as any, TASKY_DEFAULT_PROMPT);
                    } catch {}
                  }}
                >
                  Reset to Tasky default
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
                  onClick={() => {
                    try {
                      window.electronAPI.setSetting('llmSystemPrompt' as any, systemPrompt || '');
                    } catch {}
                    pushToast('Settings saved', 'success');
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">Temperature</div>
              <div className="text-xs text-muted-foreground">{temperature.toFixed(2)}</div>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="text-[11px] text-muted-foreground">
              Lower = more focused, Higher = more creative.
            </div>
          </div>
        </div>
      </Modal>

      {/* Toast notifications */}
      <ChatToasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
