export interface AIProvider {
  name: string;
  client: any;
  models: string[];
  supportsStreaming: boolean;
  supportsTools: boolean;
}

export interface AIConfig {
  provider: 'google' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamingOptions {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

// Re-export settings types
export type { AISettings, AIValidationResult, AIModelInfo, AIProviderCapabilities } from './settings';
