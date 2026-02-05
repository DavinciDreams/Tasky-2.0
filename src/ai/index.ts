import { streamText, generateText } from 'ai';
import type { AIConfig, ChatMessage, StreamingOptions } from './types';
import { createAIProvider, validateModel } from './config';

// Export settings management
export { AISettingsManager } from './settings';
export { AISettingsAdapter } from './settings/adapter';
export type { AISettings, AIValidationResult, AIModelInfo, AIProviderCapabilities } from './types/settings';

// Export core types
export type { AIConfig, ChatMessage, StreamingOptions } from './types';

export class AIService {
  private config: AIConfig;
  private provider: any;

  constructor(config: AIConfig) {
    this.config = {
      ...config,
      model: validateModel(config.provider, config.model)
    };
    this.provider = createAIProvider(this.config);
  }

  async streamText(
    messages: ChatMessage[],
    _options: StreamingOptions = {},
    tools?: any,
    abortSignal?: AbortSignal
  ) {
    const model = this.provider.getModel(this.config.model);
    
    const streamOptions: any = {
      model,
      messages,
      temperature: this.config.temperature || 1.0,
      maxTokens: this.config.maxTokens || 4096,
    };
    // Pass abort signal through to underlying SDK/fetch
    if (abortSignal) {
      // Many SDKs accept either `abortSignal` or `signal`; include both defensively
      (streamOptions as any).abortSignal = abortSignal;
      (streamOptions as any).signal = abortSignal;
    }

    // Add tools if provided and supported
    if (tools && this.provider.supportsTools) {
      streamOptions.tools = tools;
    }

    console.log(`[AIService] Streaming with ${this.config.provider} model: ${this.config.model}`);
    
  const result = await streamText(streamOptions);
    
    return {
      textStream: result.textStream,
      fullStream: result.fullStream,
      finishReason: result.finishReason,
      usage: result.usage,
      providerMetadata: result.providerMetadata
    };
  }

  async generateText(
    messages: ChatMessage[],
    tools?: any
  ) {
    const model = this.provider.getModel(this.config.model);
    
    const generateOptions: any = {
      model,
      messages,
      temperature: this.config.temperature || 1.0,
      maxTokens: this.config.maxTokens || 4096,
    };

    // Add tools if provided and supported
    if (tools && this.provider.supportsTools) {
      generateOptions.tools = tools;
    }

    console.log(`[AIService] Generating with ${this.config.provider} model: ${this.config.model}`);
    
    return await generateText(generateOptions);
  }

  updateConfig(newConfig: Partial<AIConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.config.model = validateModel(this.config.provider, this.config.model);
    this.provider = createAIProvider(this.config);
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }
}

export * from './types';
export * from './config';
export * from './providers';
