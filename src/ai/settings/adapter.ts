import type { Settings as AppSettings } from '../../types';
import type { AISettings } from '../types/settings';
import { AISettingsManager } from './index';

export class AISettingsAdapter {
  private settingsManager = AISettingsManager.getInstance();

  /**
   * Convert app settings to AI settings
   */
  fromAppSettings(appSettings: AppSettings): AISettings {
    return {
      provider: this.normalizeProvider(appSettings.llmProvider),
      apiKey: appSettings.llmApiKey || '',
      model: appSettings.llmModel || 'gemini-1.5-flash', // Respect user choice, use 1.5-flash as default
      temperature: 1.0, // Could add this to app settings later
      maxTokens: 4096, // Could add this to app settings later
      baseUrl: appSettings.llmBaseUrl,
      systemPrompt: appSettings.llmSystemPrompt,
      useCustomPrompt: appSettings.llmUseCustomPrompt
    };
  }

  /**
   * Convert AI settings back to app settings format
   */
  toAppSettings(aiSettings: AISettings): Partial<AppSettings> {
    return {
      llmProvider: aiSettings.provider,
      llmApiKey: aiSettings.apiKey,
      llmModel: aiSettings.model,
      llmBaseUrl: aiSettings.baseUrl,
      llmSystemPrompt: aiSettings.systemPrompt,
      llmUseCustomPrompt: aiSettings.useCustomPrompt
    };
  }

  /**
   * Validate and normalize app settings for AI use
   */
  validateAppSettings(appSettings: AppSettings) {
    const aiSettings = this.fromAppSettings(appSettings);
    const validation = this.settingsManager.validateSettings(aiSettings);
    const normalized = this.settingsManager.normalizeSettings(aiSettings);
    
    return {
      validation,
      normalized,
      appSettingsUpdates: this.toAppSettings(normalized)
    };
  }

  /**
   * Auto-fix common app settings issues
   */
  autoFixAppSettings(appSettings: AppSettings): { 
    fixed: Partial<AppSettings>; 
    applied: string[]; 
  } {
    const fixes: Partial<AppSettings> = {};
    const applied: string[] = [];

    // Fix missing or invalid provider
    if (!appSettings.llmProvider || !['google', 'lmstudio', 'zai', 'openrouter'].includes(appSettings.llmProvider)) {
      fixes.llmProvider = 'google';
      applied.push('Set provider to Google');
    }

    // Fix missing model
    if (!appSettings.llmModel) {
      const provider = appSettings.llmProvider || 'google';
      if (provider === 'google') {
        fixes.llmModel = 'gemini-1.5-flash';
        applied.push('Set model to Gemini 1.5 Flash');
      } else if (provider === 'zai') {
        fixes.llmModel = 'glm-4-flash';
        applied.push('Set model to GLM-4 Flash');
      } else if (provider === 'openrouter') {
        fixes.llmModel = 'openai/gpt-4o-mini';
        applied.push('Set model to GPT-4o Mini');
      } else {
        fixes.llmModel = 'llama-3.3-70b-instruct';
        applied.push('Set model to Llama 3.3 70B Instruct');
      }
    }

    // Fix missing system prompt
    if (!appSettings.llmSystemPrompt && !appSettings.llmUseCustomPrompt) {
      fixes.llmSystemPrompt = this.settingsManager.getDefaultSystemPrompt();
      applied.push('Set default system prompt');
    }

    // Fix LM Studio provider without base URL
    if (appSettings.llmProvider === 'lmstudio' && !appSettings.llmBaseUrl) {
      fixes.llmBaseUrl = 'http://localhost:1234/v1';
      applied.push('Set default LM Studio URL');
    }

    // Set default API key for LM Studio
    if (appSettings.llmProvider === 'lmstudio' && !appSettings.llmApiKey) {
      fixes.llmApiKey = 'lm-studio';
      applied.push('Set LM Studio API key');
    }

    return { fixed: fixes, applied };
  }

  private normalizeProvider(provider?: string): 'google' | 'lmstudio' | 'zai' | 'openrouter' {
    if (!provider) return 'google';

    const normalized = provider.toLowerCase();

    // Map legacy providers
    if (['openai', 'openai-compatible'].includes(normalized)) {
      return 'google'; // Migrate from OpenAI to Google
    }

    if (['lmstudio', 'lm-studio', 'local', 'custom'].includes(normalized)) {
      return 'lmstudio';
    }

    if (['zai', 'z.ai', 'zhipu', 'glm'].includes(normalized)) {
      return 'zai';
    }

    if (['openrouter', 'open-router'].includes(normalized)) {
      return 'openrouter';
    }

    return ['google', 'lmstudio', 'zai', 'openrouter'].includes(normalized)
      ? normalized as 'google' | 'lmstudio' | 'zai' | 'openrouter'
      : 'google';
  }
}
