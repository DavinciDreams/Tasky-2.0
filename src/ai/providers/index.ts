import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { AIProvider, AIConfig } from '../types';

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
