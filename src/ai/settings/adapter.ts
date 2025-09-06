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
      model: appSettings.llmModel || 'gemini-2.5-flash',
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
    if (!appSettings.llmProvider || !['google', 'custom'].includes(appSettings.llmProvider)) {
      fixes.llmProvider = 'google';
      applied.push('Set provider to Google');
    }

    // Fix missing model
    if (!appSettings.llmModel) {
      if ((appSettings.llmProvider || 'google') === 'google') {
        fixes.llmModel = 'gemini-2.5-flash';
        applied.push('Set model to Gemini 2.5 Flash');
      } else {
        fixes.llmModel = 'llama-3.1-8b-instruct';
        applied.push('Set model to Llama 3.1 8B');
      }
    }

    // Fix missing system prompt
    if (!appSettings.llmSystemPrompt && !appSettings.llmUseCustomPrompt) {
      fixes.llmSystemPrompt = this.settingsManager.getDefaultSystemPrompt();
      applied.push('Set default system prompt');
    }

    // Fix custom provider without base URL
    if (appSettings.llmProvider === 'custom' && !appSettings.llmBaseUrl) {
      fixes.llmBaseUrl = 'http://localhost:1234/v1';
      applied.push('Set default LM Studio URL');
    }

    return { fixed: fixes, applied };
  }

  private normalizeProvider(provider?: string): 'google' | 'custom' {
    if (!provider) return 'google';
    
    const normalized = provider.toLowerCase();
    
    // Map legacy providers
    if (['openai', 'openai-compatible'].includes(normalized)) {
      return 'google'; // Migrate from OpenAI to Google
    }
    
    if (['lmstudio', 'lm-studio', 'local'].includes(normalized)) {
      return 'custom';
    }
    
    return ['google', 'custom'].includes(normalized) ? normalized as 'google' | 'custom' : 'google';
  }
}
