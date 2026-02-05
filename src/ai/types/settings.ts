export interface AISettings {
  provider: 'google' | 'lmstudio' | 'zai' | 'openrouter';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  baseUrl?: string; // For LM Studio providers
  systemPrompt?: string;
  useCustomPrompt?: boolean;
}

export interface AIProviderCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsImages: boolean;
  supportsObjectGeneration: boolean;
  supportsSearch: boolean;
  supportsUrlContext: boolean;
  maxContextLength: number;
}

export interface AIModelInfo {
  id: string;
  name: string;
  description: string;
  capabilities: AIProviderCapabilities;
  isDefault?: boolean;
  isRecommended?: boolean;
}

export interface AIValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
