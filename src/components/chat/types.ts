// Chat UI Type Definitions

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ToolEvent = {
  id: string;
  phase: 'start' | 'done' | 'error';
  name: string;
  args?: any;
  output?: string;
  error?: string;
  timestamp?: number;
};

export type AdaptiveCard = {
  kind: 'confirm' | 'result';
  id?: string;
  name: string;
  args?: any;
  output?: string;
};

export type ConfirmState = {
  id: string;
  name: string;
  args: any;
} | null;

export type ChatProvider = 'openai' | 'custom';

export type Toast = {
  id: number;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
};
