import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../types';

export const useChatPersistence = () => {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Initialize chat on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Try to load the latest chat
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
          // Create new chat
          const id = await window.electronAPI.createChat('Chat');
          if (mounted) setChatId(id);
        }
      } catch (e) {
        console.warn('Failed to initialize chat:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Save messages
  const saveMessages = useCallback(async (messagesToSave?: ChatMessage[]) => {
    if (!chatId) return;
    try {
      const toSave = (messagesToSave || messages).map(m => ({
        role: m.role,
        content: m.content,
      }));
      await window.electronAPI.saveChat(chatId, toSave);
    } catch (error) {
      console.warn('Failed to save chat:', error);
    }
  }, [chatId, messages]);

  // Switch to a different chat
  const switchToChat = useCallback(async (newChatId: string) => {
    if (newChatId === chatId) return;
    
    try {
      const messages = await window.electronAPI.loadChat(newChatId);
      if (Array.isArray(messages)) {
        const loadedMessages = messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
        setMessages(loadedMessages);
        setChatId(newChatId);
      }
    } catch (error) {
      console.warn('Failed to switch to chat:', error);
    }
  }, [chatId]);

  // Create new chat
  const createNewChat = useCallback(async () => {
    try {
      const id = await window.electronAPI.createChat('Chat');
      setChatId(id);
      setMessages([]);
      return id;
    } catch (error) {
      console.warn('Failed to create new chat:', error);
      return null;
    }
  }, []);

  return {
    chatId,
    messages,
    setMessages,
    saveMessages,
    switchToChat,
    createNewChat,
  };
};
