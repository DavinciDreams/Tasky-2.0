import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createZhipu } from 'zhipu-ai-provider';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { AIProvider } from '../types';

// Export Google AI models for UI consumption
export const GOOGLE_AI_MODELS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-8b-latest'
];

export class GoogleAIProvider implements AIProvider {
  name = 'google';
  client: any;
  models = GOOGLE_AI_MODELS;
  supportsStreaming = true;
  supportsTools = true;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('Google API key is required');
    }
    this.client = createGoogleGenerativeAI({
      apiKey: apiKey
    });
  }

  getModel(modelId: string) {
    return this.client(modelId);
  }

  validateModel(modelId: string): string {
    const requested = modelId.toLowerCase();
    
    // Map common model names to best available models
    if (requested.includes('2.5-pro') || requested.includes('pro')) return 'gemini-2.5-pro';
    if (requested.includes('2.5-flash')) return 'gemini-2.5-flash';
    if (requested.includes('2.0-flash')) return 'gemini-2.0-flash';
    if (requested.includes('1.5-pro')) return 'gemini-2.5-pro'; // Fallback to 2.5-pro since 1.5-pro is removed
    if (requested.includes('1.5-flash-8b')) return 'gemini-1.5-flash-8b-latest';
    if (requested.includes('1.5-flash')) return 'gemini-1.5-flash-latest';
    if (requested.includes('flash-8b')) return 'gemini-1.5-flash-8b-latest';
    if (requested.includes('flash')) return modelId; // Respect user's exact choice, don't force 2.5
    
    // If no match, return the original model ID to respect user choice
    return modelId;
  }
}

export class LMStudioProvider implements AIProvider {
  name = 'lmstudio';
  client: any;
  models: string[] = [];
  supportsStreaming = true;
  supportsTools = false;

  constructor(config: { baseUrl: string; apiKey?: string; modelId?: string }) {
    this.client = createOpenAICompatible({
      name: 'lmstudio',
      baseURL: config.baseUrl,
      apiKey: config.apiKey || 'not-needed-for-local'
    });
    
    if (config.modelId) {
      this.models = [config.modelId];
    }
  }

  getModel(modelId: string) {
    return this.client(modelId);
  }

  validateModel(modelId: string): string {
    return modelId; // Pass through as-is for LM Studio
  }
}

// Export Z.AI models for UI consumption
export const ZAI_MODELS = [
  'glm-4.7',
  'glm-4.6',
  'glm-4.5',
  'glm-4-plus',
  'glm-4-long',
  'glm-4-flash'
];

export class ZAIProvider implements AIProvider {
  name = 'zai';
  client: any;
  models = ZAI_MODELS;
  supportsStreaming = true;
  supportsTools = true;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('Z.AI API key is required');
    }
    this.client = createZhipu({
      apiKey: apiKey
    });
  }

  getModel(modelId: string) {
    return this.client(modelId);
  }

  validateModel(modelId: string): string {
    const requested = modelId.toLowerCase();
    if (requested.includes('4.7')) return 'glm-4.7';
    if (requested.includes('4.6')) return 'glm-4.6';
    if (requested.includes('4.5')) return 'glm-4.5';
    if (requested.includes('4-plus') || requested.includes('plus')) return 'glm-4-plus';
    if (requested.includes('4-long') || requested.includes('long')) return 'glm-4-long';
    if (requested.includes('4-flash') || requested.includes('flash')) return 'glm-4-flash';
    return modelId;
  }
}

// Export OpenRouter popular models for UI consumption
export const OPENROUTER_POPULAR_MODELS = [
  'anthropic/claude-sonnet-4',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
  'meta-llama/llama-4-maverick',
  'deepseek/deepseek-r1',
  'mistralai/mistral-large'
];

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter';
  client: any;
  models = OPENROUTER_POPULAR_MODELS;
  supportsStreaming = true;
  supportsTools = true;

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.client = createOpenRouter({
      apiKey: apiKey
    });
  }

  getModel(modelId: string) {
    return this.client(modelId);
  }

  validateModel(modelId: string): string {
    return modelId; // OpenRouter supports 300+ models, pass through as-is
  }
}
