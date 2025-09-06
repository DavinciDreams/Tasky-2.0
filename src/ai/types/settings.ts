export interface AISettings {
  provider: 'google' | 'custom';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  baseUrl?: string; // For custom providers
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
