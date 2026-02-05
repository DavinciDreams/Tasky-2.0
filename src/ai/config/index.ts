import type { AIConfig, AIProvider } from '../types';
import { GoogleAIProvider, LMStudioProvider, ZAIProvider, OpenRouterProvider } from '../providers';

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'google',
  model: 'gemini-1.5-flash', // Use 1.5-flash as default
  temperature: 1.0,
  maxTokens: 4096
};

export const SUPPORTED_GOOGLE_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite', 
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b-latest',
  // Legacy models for compatibility
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b'
] as const;

export const SUPPORTED_ZAI_MODELS = [
  'glm-4.7',
  'glm-4.6',
  'glm-4.5',
  'glm-4-plus',
  'glm-4-long',
  'glm-4-flash'
] as const;

export const SUPPORTED_OPENROUTER_MODELS = [
  'anthropic/claude-sonnet-4',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
  'meta-llama/llama-4-maverick',
  'deepseek/deepseek-r1',
  'mistralai/mistral-large'
] as const;

export function createAIProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case 'google':
      return new GoogleAIProvider(config.apiKey);
    case 'lmstudio':
      if (!config.baseUrl) {
        throw new Error('LM Studio provider requires baseUrl');
      }
      return new LMStudioProvider({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        modelId: config.model
      });
    case 'zai':
      return new ZAIProvider(config.apiKey);
    case 'openrouter':
      return new OpenRouterProvider(config.apiKey);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

export function validateModel(provider: string, model: string): string {
  switch (provider) {
    case 'google':
      return SUPPORTED_GOOGLE_MODELS.includes(model as any) ? model : 'gemini-1.5-flash'; // Use 1.5-flash as fallback
    case 'lmstudio':
      return model; // LM Studio providers can use any model
    case 'zai':
      return SUPPORTED_ZAI_MODELS.includes(model as any) ? model : 'glm-4-flash';
    case 'openrouter':
      return model; // OpenRouter supports 300+ models, pass through as-is
    default:
      return 'gemini-1.5-flash'; // Use 1.5-flash as default fallback
  }
}
