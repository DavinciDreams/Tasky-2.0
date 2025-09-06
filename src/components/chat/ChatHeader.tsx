import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Modal } from '../ui/modal';
import { GOOGLE_AI_MODELS } from '../../ai/providers';
import type { Settings } from '../../types';

interface ChatHeaderProps {
  settings: Settings;
  onSettingChange?: (key: keyof Settings, value: any) => void;
  chatId: string | null;
  onChatSwitch: (chatId: string) => void;
  onNewChat: () => void;
  busy: boolean;
  rootRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  settings,
  onSettingChange,
  chatId,
  onChatSwitch,
  onNewChat,
  busy,
  rootRef,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [allChats, setAllChats] = useState<Array<{ id: string; title: string; preview: string; timestamp: string }>>([]);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const historyAnchorRef = useRef<HTMLDivElement | null>(null);

  // Load chat history
  const loadChatHistory = async () => {
    try {
      const chats = await window.electronAPI.listChats(50);
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

  useEffect(() => {
    loadChatHistory();
  }, []);

  // Get available models for the current provider
  const getAvailableModels = (provider: string) => {
    const normalizedProvider = provider.toLowerCase();
    
    if (normalizedProvider === 'google') {
      return GOOGLE_AI_MODELS.map(model => ({
        value: model,
        label: model
          .replace('gemini-', 'Gemini ')
          .replace('-', ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
      }));
    }
    
    // For custom providers, provide some common models
    return [
      { value: 'llama-3.1-70b', label: 'Llama 3.1 70B' },
      { value: 'llama-3.1-8b', label: 'Llama 3.1 8B' },
      { value: 'mistral-7b', label: 'Mistral 7B' },
      { value: 'codellama-13b', label: 'CodeLlama 13B' },
    ];
  };

  // Modal handles its own click-outside behavior, so no need for manual handling

  const handleDeleteChat = async (deleteId: string) => {
    try {
      await window.electronAPI.deleteChat(deleteId);
      await loadChatHistory();
      if (deleteId === chatId) {
        const updatedList = await window.electronAPI.listChats(50).catch(() => []);
        if (Array.isArray(updatedList) && updatedList.length > 0) {
          onChatSwitch(updatedList[0].id);
        } else {
          onNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleRenameChat = async (oldId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setRenameId(null);
      return;
    }
    try {
      const msgs = await window.electronAPI.loadChat(oldId).catch(() => []);
      const newId = await window.electronAPI.createChat(newTitle.trim());
      if (Array.isArray(msgs)) {
        await window.electronAPI.saveChat(newId, msgs);
      }
      await window.electronAPI.deleteChat(oldId);
      await loadChatHistory();
      if (oldId === chatId) {
        onChatSwitch(newId);
      }
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
    setRenameId(null);
  };

  return (
    <div className="flex-shrink-0 flex items-center justify-between mb-2 px-1">
      <div className="flex items-center justify-between w-full gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Left side - History */}
        <div className="relative inline-block" ref={historyAnchorRef}>
          <Button
            size="default"
            variant="outline"
            className="rounded-xl text-sm h-10 px-3 flex items-center gap-2 border-border bg-card hover:bg-muted text-foreground flex-shrink-0"
            disabled={busy}
            onClick={() => {
              const nextOpen = !showHistory;
              setShowHistory(nextOpen);
              if (nextOpen) {
                loadChatHistory();
              }
            }}
          >
            <span>📋</span>
            <span>History</span>
            <span className={`transition-transform ${showHistory ? 'rotate-180' : ''}`}>▼</span>
          </Button>

          {/* Chat History Modal */}
          <Modal
            open={showHistory}
            title="Chat History"
            onClose={() => setShowHistory(false)}
            maxWidth={560}
            fullHeight
            tone="background"
            backdropClass="bg-black/60"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 rounded-xl"
                  onClick={async () => {
                    try {
                      const id = await window.electronAPI.createChat('Chat');
                      await loadChatHistory();
                      onChatSwitch(id);
                    } catch {}
                  }}
                >
                  + New Chat
                </Button>
              </div>
              
              <div className="space-y-3">
                {allChats.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No chat history found</div>
                ) : (
                  allChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                        chat.id === chatId
                          ? 'bg-primary/5 border-primary/30'
                          : 'border-border/30 hover:bg-secondary/20'
                      }`}
                      onClick={() => onChatSwitch(chat.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {renameId === chat.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                className="bg-background border border-border/30 rounded px-2 py-1 text-sm w-full text-foreground"
                                value={renameValue}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleRenameChat(chat.id, renameValue);
                                  } else if (e.key === 'Escape') {
                                    setRenameId(null);
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  handleRenameChat(chat.id, renameValue);
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameId(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium truncate text-foreground">{chat.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">{chat.timestamp}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">{chat.preview}</div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {chat.id === chatId && (
                            <div className="text-primary text-[11px] font-medium">Current</div>
                          )}
                          {renameId !== chat.id && (
                            <>
                              <Button
                                size="sm"
                                className="h-6 px-2 rounded-md text-xs bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameId(chat.id);
                                  setRenameValue(chat.title || '');
                                }}
                              >
                                Rename
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 rounded-md text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChat(chat.id);
                                }}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Modal>
        </div>

        {/* Right side - Model selector */}
        <div className="flex items-center gap-2">
          {/* Model selector */}
          <select
            value={String(settings.llmModel || 'gemini-2.5-flash')}
            onChange={(e) => onSettingChange && onSettingChange('llmModel', e.target.value)}
            className="bg-card text-foreground border border-border rounded-xl text-xs h-8 w-[140px] pl-2 pr-6 hover:border-border focus:border-primary/50 focus:outline-none transition-colors cursor-pointer flex-shrink-0"
          >
            {getAvailableModels(settings.llmProvider || 'google').map(model => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
