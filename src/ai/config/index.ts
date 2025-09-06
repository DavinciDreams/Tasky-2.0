import type { AIConfig, AIProvider } from '../types';
import { GoogleAIProvider, CustomAIProvider } from '../providers';

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'google',
  model: 'gemini-2.5-flash',
  temperature: 1.0,
  maxTokens: 4096
};

export const SUPPORTED_GOOGLE_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite', 
  'gemini-2.0-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b-latest',
  // Legacy models for compatibility
  'gemini-1.5-pro',
  'gemini-1.5-flash', 
  'gemini-1.5-flash-8b'
] as const;

export function createAIProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case 'google':
      return new GoogleAIProvider(config.apiKey);
    case 'custom':
      if (!config.baseUrl) {
        throw new Error('Custom provider requires baseUrl');
      }
      return new CustomAIProvider({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        modelId: config.model
      });
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

export function validateModel(provider: string, model: string): string {
  switch (provider) {
    case 'google':
      return SUPPORTED_GOOGLE_MODELS.includes(model as any) ? model : 'gemini-2.5-flash';
    case 'custom':
      return model; // Custom providers can use any model
    default:
      return 'gemini-2.5-flash';
  }
}
