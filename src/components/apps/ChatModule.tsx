import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AIService, AISettingsAdapter, AISettingsManager } from '../../ai';
import type { AIConfig } from '../../ai';

// UI Components
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';

// Chat Components
import {
  MessageContainer,
  ChatComposer,
  ConfirmOverlay,
  useMcpTools,
  useScroll,
  useChatPersistence,
} from '../chat';

// Types and Tools
import type { Settings as AppSettings } from '../../types';
import type { ChatMessage, ToolEvent } from '../chat/types';
import { mcpCall, callMcpTool } from '../../ai/mcp-tools';

interface ChatModuleProps {
  settings: AppSettings;
  onSettingChange?: (key: keyof AppSettings, value: any) => void;
}

/**
 * Refactored Chat Module with modular components and theme integration
 */
export const ChatModule: React.FC<ChatModuleProps> = ({ settings, onSettingChange }) => {
  const TASKY_DEFAULT_PROMPT = `You are Tasky, the in‑app assistant for Tasky. Stay concise, helpful, and focused on Tasky features: general conversation/ideation plus managing Tasks and Reminders.

When users want to create, list, update, delete, or execute tasks or reminders, use the mcpCall tool with the appropriate MCP tool name and arguments.

TASK TOOLS (use mcpCall tool with these names):
- tasky_create_task: Create tasks with title, description, dueDate, tags, etc.
- tasky_list_tasks: List existing tasks with optional filtering  
- tasky_update_task: Update task status or properties
- tasky_delete_task: Delete tasks by ID
- tasky_execute_task: Execute a task (start or complete it)

REMINDER TOOLS (use mcpCall tool with these names):
- tasky_create_reminder: Create reminders with message, time, days array, oneTime boolean
- tasky_list_reminders: List existing reminders
- tasky_update_reminder: Update reminders (message, time, days, enabled)
- tasky_delete_reminder: Delete reminders by ID or message

IMPORTANT: 
- Always use the mcpCall tool function when users request task or reminder operations
- Extract parameters properly from natural language requests
- Show a brief "Plan:" before calling tools
- Use tools only when intent is actionable
- Map "start"→IN_PROGRESS, "finish"→COMPLETED

For listing tasks, call mcpCall with name="tasky_list_tasks" and args={}. Do NOT output text like "<mcpCall name=..." - use the actual function call.`;

  // State - Chat persistence
  const {
    chatId,
    messages,
    setMessages,
    saveMessages,
    switchToChat,
    createNewChat,
  } = useChatPersistence();
  
  // Other state
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>(String(settings.llmSystemPrompt || ''));
  const [useCustomPrompt, setUseCustomPrompt] = useState<boolean>(!!settings.llmUseCustomPrompt);
  const [temperature, setTemperature] = useState<number>(1.0);
  const [mcpReady, setMcpReady] = useState<boolean>(false);
  const [checkedMcp, setCheckedMcp] = useState<boolean>(false);
  const [streamingAssistantMessage, setStreamingAssistantMessage] = useState<string>('');

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const lastFlushRef = useRef<number>(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Custom hooks
  const {
    toolEvents,
    pendingConfirm,
    pendingResult,
    loadingTools,
    handleConfirm,
    createConfirmSnapshot,
    createResultSnapshot,
    clearResult,
  } = useMcpTools(chatId); // Pass chat ID for MCP tools
  const {
    scrollRef,
    scrollToBottom,
    handleScroll,
    autoScrollIfNeeded,
  } = useScroll();

  // Update messages ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Save messages when they change (and we have a chat ID)
  useEffect(() => {
    if (chatId && messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages, chatId, saveMessages]);

  // Reset chat function
  const resetChat = useCallback(async () => {
    try {
      // Reset all chats in the database
      await window.electronAPI.resetChats();
      
      // Clear local state
      setMessages([]);
      setInput('');
      setError(null);
      setStreamingAssistantMessage('');
      setBusy(false);
      
      // Reset to no chat ID (empty state)
      switchToChat(null);
      
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    } catch (error) {
      console.error('Failed to reset chat:', error);
      setError('Failed to reset chat');
    }
  }, [setMessages, switchToChat]);

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
      try {
        await (window as any).electronAPI.mcpToolsList();
        setMcpReady(true);
      } catch (error) {
        console.warn('[Chat] MCP tools list failed:', error);
        setMcpReady(false);
      }
    } catch {
      setMcpReady(false);
    }
  };

  // Settings validation and auto-fix
  const validateSettings = () => {
    console.log('[Chat] Validating settings:', {
      provider: settings.llmProvider,
      apiKey: settings.llmApiKey ? '***set***' : 'missing',
      model: settings.llmModel,
      baseUrl: settings.llmBaseUrl
    });
    
    const adapter = new AISettingsAdapter();
    const settingsManager = AISettingsManager.getInstance();
    
    // First pass: auto-fix obvious issues
    const autoFix = adapter.autoFixAppSettings(settings);
    if (autoFix.applied.length > 0) {
      console.log('[Chat] Auto-fixing settings:', autoFix.applied);
      // Apply fixes
      Object.entries(autoFix.fixed).forEach(([key, value]) => {
        onSettingChange?.(key as keyof AppSettings, value);
      });
    }
    
    // Validate current settings
    const aiSettings = adapter.fromAppSettings(settings);
    const validation = settingsManager.validateSettings(aiSettings);
    
    console.log('[Chat] Validation result:', { 
      isValid: validation.isValid, 
      errors: validation.errors.length, 
      warnings: validation.warnings.length 
    });
    
    if (!validation.isValid) {
      console.warn('[Chat] Settings validation failed:', validation.errors);
      
      // Show helpful error message inside the chat as an assistant bubble
      const errorMsg = validation.errors.join(', ');
      const suggestionsMsg = validation.suggestions.length > 0 
        ? ' Suggestions: ' + validation.suggestions.join(', ')
        : '';
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Chat setup needed: ${errorMsg}${suggestionsMsg}` 
      } as ChatMessage]);
      
      return false;
    }
    
    console.log('[Chat] Settings validation passed');
    return true;
  };

  useEffect(() => {
    ensureMcp();
  }, []);

  // Build AI service
  const aiService = useMemo(() => {
    const adapter = new AISettingsAdapter();
    const aiSettings = adapter.fromAppSettings(settings);
    const settingsManager = AISettingsManager.getInstance();
    const normalizedSettings = settingsManager.normalizeSettings(aiSettings);
    
    const config: AIConfig = {
      provider: normalizedSettings.provider,
      apiKey: normalizedSettings.apiKey,
      model: normalizedSettings.model,
      temperature: normalizedSettings.temperature,
      maxTokens: normalizedSettings.maxTokens,
      baseUrl: normalizedSettings.baseUrl
    };
    
    try {
      return new AIService(config);
    } catch (error) {
      console.error('[Chat] Failed to create AI service:', error);
      // Fallback to Google with default model
      return new AIService({
        provider: 'google',
        apiKey: settings.llmApiKey || '',
        model: 'gemini-2.5-flash',
        temperature: temperature
      });
    }
  }, [settings.llmProvider, settings.llmApiKey, settings.llmModel, settings.llmBaseUrl, temperature]);

  const providerSupported = useMemo(() => ['google', 'lmstudio'].includes(
    (settings.llmProvider || 'google').toLowerCase()
  ), [settings.llmProvider]);

  // Persist confirm/result snapshots (simplified without chat persistence)
  useEffect(() => {
    const snapshot = createConfirmSnapshot();
    if (snapshot) {
      setMessages(prev => [...prev, snapshot]);
    }
  }, [pendingConfirm, createConfirmSnapshot]);

  useEffect(() => {
    const snapshot = createResultSnapshot();
    if (snapshot) {
      setMessages(prev => [...prev, snapshot]);
      clearResult();
      autoScrollIfNeeded();
    }
  }, [pendingResult?.id, createResultSnapshot, clearResult, autoScrollIfNeeded]);

  // Handle confirmation (simplified without chat deletion)
  const handleConfirmSimplified = useCallback(async (accepted: boolean) => {
    handleConfirm(accepted);
  }, [handleConfirm]);

  // Send message
  const onSend = async () => {
    console.log('[Chat] onSend called with input:', input);
    const trimmed = input.trim();
    if (!trimmed || busy) {
      console.log('[Chat] Blocked: empty input or busy:', { trimmed, busy });
      return;
    }
    
    // Ensure we have a chat to save to
    let currentChatId = chatId;
    if (!currentChatId) {
      console.log('[Chat] Creating new chat for first message');
      currentChatId = await createNewChat();
      if (!currentChatId) {
        setError('Failed to create chat session');
        return;
      }
    }
    
    // Check for inline JSON tool call pattern and run immediately
    try {
      const maybeJson = JSON.parse(trimmed);
      if (maybeJson && maybeJson.name && typeof maybeJson.name === 'string') {
        setError(null);
        setBusy(true);
        const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        // surface confirm overlay
        try {
          (window as any).dispatchEvent(new CustomEvent('tasky:tool:confirm', { detail: { id, name: maybeJson.name, args: maybeJson.args || {} } }));
        } catch {}
        const acceptedPromise = new Promise<boolean>((resolve) => {
          const handler = (e: any) => {
            const d = e?.detail || {};
            if (d.id === id) {
              (window as any).removeEventListener('tasky:tool:confirm:response', handler);
              resolve(!!d.accepted);
            }
          };
          (window as any).addEventListener('tasky:tool:confirm:response', handler);
          setTimeout(() => resolve(false), 15000);
        });
        const accepted = await acceptedPromise;
        if (!accepted) {
          setBusy(false);
          return;
        }
        // execute
        const output = await callMcpTool(maybeJson.name, maybeJson.args || {});
        try {
          (window as any).dispatchEvent(new CustomEvent('tasky:tool', { detail: { id, phase: 'done', name: maybeJson.name, args: maybeJson.args || {}, output } }));
        } catch {}
        setBusy(false);
        return;
      }
    } catch {}

    // Validate settings before sending
    console.log('[Chat] Validating settings...');
    if (!validateSettings()) {
      console.log('[Chat] Validation failed, not sending message');
      return;
    }
    console.log('[Chat] Validation passed, proceeding with send');
    
    setError(null);
    const next = [...messagesRef.current, { role: 'user', content: trimmed } as ChatMessage];
    setMessages(next);
    setInput('');
    setBusy(true);
    requestAnimationFrame(scrollToBottom);

    // Prepare variables so they are accessible in catch/fallback
    let chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    let controller: AbortController | null = null;

    try {
      // No chat persistence needed - just process the messages
      if (!providerSupported) {
        throw new Error('Selected provider not yet supported in this chat module');
      }

      const effectiveSys = useCustomPrompt && systemPrompt.trim().length > 0 
        ? systemPrompt.trim() 
        : TASKY_DEFAULT_PROMPT;

      chatMessages = [
        { role: 'system', content: effectiveSys },
        ...next.map(m => ({ role: m.role, content: m.content }))
      ];

      // Setup streaming with AI service
      controller = new AbortController();
      abortRef.current = controller;

      // Enable MCP tools when server is ready
      const tools = mcpReady ? { mcpCall } as any : undefined;
      console.log('[Chat] Tools enabled:', !!tools, 'MCP ready:', mcpReady);

      try {
        const result = await aiService.streamText(
          chatMessages as any,
          {
            onStart: () => {
              console.log('[Chat] Stream started');
            },
            onError: (error) => {
              console.error('[Chat] Stream error:', error);
            }
          },
          tools
        );
        
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
        
        // No chat persistence needed
        
      } catch (schemaErr: any) {
        // If tool schema errors (400) or invalid function schema, retry without tools
        const msg = schemaErr?.message || '';
        if (msg.includes('Invalid schema') || msg.includes('400')) {
          console.warn('[Chat] Tool schema error, retrying without tools');
          // Already running without tools, so just throw the error
          throw schemaErr;
        } else {
          throw schemaErr;
        }
      }
      
    } catch (e: any) {
      console.error('[Chat] Error during stream:', e);

      // Fallback: if schema/400 errors, retry once without tools
      const errorMessage = e?.message || '';
      const isSchemaOr400 = errorMessage.includes('Invalid schema') || errorMessage.includes('400');
      if (isSchemaOr400) {
        try {
          console.warn('[Chat] Retrying without tools due to schema/400 error');
          const retryResult = await aiService.streamText(
            chatMessages as any,
            {
              onStart: () => {
                console.log('[Chat] Retry stream started');
              },
              onError: (error) => {
                console.error('[Chat] Retry stream error:', error);
              }
            }
          );

          // Stream response (retry)
          let assistantMessageRetry = '';
          let streamStartedRetry = false;
          setStreamingAssistantMessage('');
          try {
            for await (const chunk of retryResult.textStream) {
              assistantMessageRetry += chunk;
              setStreamingAssistantMessage(assistantMessageRetry);
              const nowRetry = (typeof performance !== 'undefined' ? performance.now() : Date.now());
              const shouldFlushRetry = nowRetry - (lastFlushRef.current || 0) > 60 || chunk.includes('\n');
              if (shouldFlushRetry) {
                lastFlushRef.current = nowRetry;
                if (!streamStartedRetry) {
                  setMessages(prev => [...prev, { role: 'assistant', content: '' } as ChatMessage]);
                  streamStartedRetry = true;
                }
                autoScrollIfNeeded();
              }
            }
            setStreamingAssistantMessage('');
            setMessages(prev => {
              const copy = [...prev];
              const lastIdx = copy.length - 1;
              if (streamStartedRetry && lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
                copy[lastIdx] = { role: 'assistant', content: assistantMessageRetry } as ChatMessage;
              } else {
                copy.push({ role: 'assistant', content: assistantMessageRetry } as ChatMessage);
              }
              return copy;
            });
            autoScrollIfNeeded();

            // No chat persistence needed
            return; // handled fallback successfully
          } catch (retryErr) {
            console.warn('[Chat] Retry stream failed:', (retryErr as any)?.message);
          }
        } catch (retrySetupErr) {
          console.warn('[Chat] Retry setup failed:', (retrySetupErr as any)?.message);
        }
      }

      let msg = 'Chat request failed';
      if (errorMessage.includes('Invalid schema')) {
        msg = 'Tool configuration error. Please check MCP server status.';
      } else if (errorMessage.includes('401')) {
        msg = 'Invalid API key. Please check your Google AI API key in settings.';
      } else if (errorMessage.includes('400')) {
        msg = 'Bad request. Please check your provider settings.';
      } else if (errorMessage.includes('429')) {
        msg = 'Rate limit exceeded. Please try again later.';
      } else if (errorMessage.includes('insufficient_quota') || errorMessage.includes('quota')) {
        msg = 'API quota exceeded. Please check your billing or try a local model.';
      } else if (errorMessage.includes('fetch')) {
        msg = 'Network error. Please check your internet connection.';
      } else if (e?.message) {
        msg = e.message;
      }

      setError(msg);
      console.error('Chat error:', msg);
      
      // No chat persistence needed
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
        {/* Simple header with reset button */}
        <div className="flex-shrink-0 flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Tasky Chat</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-sm h-7 px-3 py-1 flex items-center gap-2 border-border bg-card hover:bg-muted text-foreground focus:ring-0 focus:border-border focus:outline-none focus:ring-offset-0 focus:shadow-none"
              disabled={busy}
              onClick={resetChat}
            >
              <span>🔄</span>
              <span>Reset Chat</span>
            </Button>
          </div>
        </div>

        {!providerSupported && (
          <div className="text-xs text-accent mb-2">
            Provider not yet supported here. Please select Google or LM Studio in Settings.
          </div>
        )}

        {/* Message container with simplified background */}
        <div className="flex-1 w-full rounded-2xl border border-border/30 p-2 flex flex-col min-h-[calc(100vh-280px)] max-h-[calc(100vh-280px)] relative overflow-hidden bg-background">

          <div
            ref={scrollRef}
            className="flex-1 min-h-[calc(100vh-280px)] max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar p-2 w-full relative"
            onScroll={handleScroll}
          >
            {/* Use the new MessageContainer for proper ordering */}
            <MessageContainer
              messages={messages}
              toolEvents={toolEvents}
              pendingConfirm={pendingConfirm}
              isStreaming={busy}
              streamingContent={streamingAssistantMessage}
              onConfirm={handleConfirmSimplified}
            />
          </div>
        </div>

        {/* Confirmation overlay - Hidden when using inline confirmations */}
        {false && pendingConfirm && (
          <ConfirmOverlay
            pendingConfirm={pendingConfirm}
            onConfirm={handleConfirmSimplified}
            rootRef={rootRef}
          />
        )}
      </div>

      {/* Composer with proper spacing */}
      <div className="px-3 pb-3 pt-2">
        <ChatComposer
          input={input}
          setInput={setInput}
          onSend={onSend}
          onStop={onStop}
          busy={busy}
        />
      </div>
    </div>
  );
};
