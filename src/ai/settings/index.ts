import type { AISettings, AIValidationResult, AIModelInfo, AIProviderCapabilities } from '../types/settings';
import { SUPPORTED_GOOGLE_MODELS } from '../config';

export class AISettingsManager {
  private static instance: AISettingsManager;
  
  static getInstance(): AISettingsManager {
    if (!AISettingsManager.instance) {
      AISettingsManager.instance = new AISettingsManager();
    }
    return AISettingsManager.instance;
  }

  getDefaultSettings(): AISettings {
    return {
      provider: 'google',
      apiKey: '',
      model: 'gemini-2.5-flash',
      temperature: 1.0,
      maxTokens: 4096,
      systemPrompt: this.getDefaultSystemPrompt(),
      useCustomPrompt: false
    };
  }

  getDefaultSystemPrompt(): string {
    return `You are Tasky, the in‑app assistant for Tasky. Stay concise, helpful, and focused on Tasky features: general conversation/ideation plus managing Tasks and Reminders.

When users want to create, list, update, delete, or execute tasks or reminders, use the mcpCall tool with the appropriate MCP tool name and arguments.

TASK TOOLS (use mcpCall tool with these names):
- tasky_create_task: Create tasks with title, description, dueDate, tags, etc.
- tasky_list_tasks: List existing tasks with optional filtering  
- tasky_update_task: Update task status or properties
- tasky_delete_task: Delete tasks by ID
- tasky_execute_task: Execute a task (start or complete it)

REMINDER TOOLS (use mcpCall tool with these names):
- tasky_create_reminder: Create reminders with message, time, days array, oneTime boolean
- tasky_list_reminders: List existing reminders
- tasky_update_reminder: Update reminders (message, time, days, enabled)
- tasky_delete_reminder: Delete reminders by ID or message

IMPORTANT: 
- Always use the mcpCall tool function when users request task or reminder operations
- Extract parameters properly from natural language requests
- Show a brief "Plan:" before calling tools
- Use tools only when intent is actionable
- Map "start"→IN_PROGRESS, "finish"→COMPLETED

For listing tasks, call mcpCall with name="tasky_list_tasks" and args={}. Do NOT output text like "<mcpCall name=..." - use the actual function call.`;
  }

  validateSettings(settings: Partial<AISettings>): AIValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Provider validation
    if (!settings.provider) {
      errors.push('AI provider is required');
    } else if (!['google', 'custom'].includes(settings.provider)) {
      errors.push('AI provider must be either "google" or "custom"');
    }

    // API Key validation
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      if (settings.provider === 'google') {
        errors.push('Google AI API key is required');
        suggestions.push('Get your API key from https://aistudio.google.com/app/apikey');
      } else if (settings.provider === 'custom' && (!settings.baseUrl || !settings.baseUrl.includes('localhost'))) {
        warnings.push('API key recommended for external custom providers');
      }
    }

    // Model validation
    if (!settings.model) {
      errors.push('AI model is required');
    } else if (settings.provider === 'google') {
      if (!SUPPORTED_GOOGLE_MODELS.includes(settings.model as any)) {
        warnings.push(`Model "${settings.model}" may not be supported. Recommended: gemini-2.5-flash`);
        suggestions.push('Use a supported Google model for best compatibility');
      }
    }

    // Base URL validation for custom providers
    if (settings.provider === 'custom') {
      if (!settings.baseUrl || settings.baseUrl.trim() === '') {
        errors.push('Base URL is required for custom providers');
        suggestions.push('Example: http://localhost:1234/v1 for LM Studio');
      } else {
        try {
          new URL(settings.baseUrl);
        } catch {
          errors.push('Base URL must be a valid URL');
        }
      }
    }

    // Temperature validation
    if (settings.temperature !== undefined) {
      if (settings.temperature < 0 || settings.temperature > 2) {
        warnings.push('Temperature should be between 0 and 2');
      }
    }

    // Max tokens validation
    if (settings.maxTokens !== undefined) {
      if (settings.maxTokens < 1 || settings.maxTokens > 32000) {
        warnings.push('Max tokens should be between 1 and 32000');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  getAvailableModels(provider: string): AIModelInfo[] {
    switch (provider) {
      case 'google':
        return this.getGoogleModels();
      case 'custom':
        return this.getCustomModels();
      default:
        return [];
    }
  }

  private getGoogleModels(): AIModelInfo[] {
    const baseCapabilities: AIProviderCapabilities = {
      supportsStreaming: true,
      supportsTools: true,
      supportsImages: true,
      supportsObjectGeneration: true,
      supportsSearch: true,
      supportsUrlContext: true,
      maxContextLength: 1000000
    };

    return [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Most capable model for complex reasoning and analysis',
        capabilities: { ...baseCapabilities, maxContextLength: 2000000 },
        isRecommended: false
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Fast and efficient for most tasks - recommended',
        capabilities: baseCapabilities,
        isDefault: true,
        isRecommended: true
      },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: 'Lightweight version for simple tasks',
        capabilities: { ...baseCapabilities, maxContextLength: 500000 }
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Previous generation fast model',
        capabilities: baseCapabilities
      },
      {
        id: 'gemini-1.5-pro-latest',
        name: 'Gemini 1.5 Pro Latest',
        description: 'Latest 1.5 Pro model',
        capabilities: baseCapabilities
      },
      {
        id: 'gemini-1.5-flash-latest',
        name: 'Gemini 1.5 Flash Latest',
        description: 'Latest 1.5 Flash model',
        capabilities: baseCapabilities
      },
      {
        id: 'gemini-1.5-flash-8b-latest',
        name: 'Gemini 1.5 Flash 8B Latest',
        description: 'Smallest and fastest model',
        capabilities: { ...baseCapabilities, maxContextLength: 100000 }
      }
    ];
  }

  private getCustomModels(): AIModelInfo[] {
    const customCapabilities: AIProviderCapabilities = {
      supportsStreaming: true,
      supportsTools: false, // Most custom providers don't support tools
      supportsImages: false, // Depends on the model
      supportsObjectGeneration: false,
      supportsSearch: false,
      supportsUrlContext: false,
      maxContextLength: 4096 // Varies by model
    };

    return [
      {
        id: 'llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B Instruct',
        description: 'Popular open-source model for local hosting',
        capabilities: customCapabilities,
        isDefault: true
      },
      {
        id: 'llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B Instruct',
        description: 'Larger Llama model with better performance',
        capabilities: { ...customCapabilities, maxContextLength: 8192 }
      },
      {
        id: 'custom-model',
        name: 'Custom Model',
        description: 'Your own model configuration',
        capabilities: customCapabilities
      }
    ];
  }

  getProviderCapabilities(provider: string, model?: string): AIProviderCapabilities {
    const models = this.getAvailableModels(provider);
    if (model) {
      const modelInfo = models.find(m => m.id === model);
      if (modelInfo) {
        return modelInfo.capabilities;
      }
    }
    
    // Return default capabilities for provider
    if (provider === 'google') {
      return this.getGoogleModels()[0].capabilities;
    } else {
      return this.getCustomModels()[0].capabilities;
    }
  }

  normalizeSettings(settings: Partial<AISettings>): AISettings {
    const defaults = this.getDefaultSettings();
    
    return {
      provider: settings.provider || defaults.provider,
      apiKey: settings.apiKey || defaults.apiKey,
      model: this.normalizeModel(settings.provider || defaults.provider, settings.model || defaults.model),
      temperature: Math.max(0, Math.min(2, settings.temperature ?? defaults.temperature)),
      maxTokens: Math.max(1, Math.min(32000, settings.maxTokens ?? defaults.maxTokens)),
      baseUrl: settings.baseUrl || defaults.baseUrl,
      systemPrompt: settings.systemPrompt || defaults.systemPrompt,
      useCustomPrompt: settings.useCustomPrompt ?? defaults.useCustomPrompt
    };
  }

  private normalizeModel(provider: string, model: string): string {
    const availableModels = this.getAvailableModels(provider);
    
    // Check if model exists
    if (availableModels.some(m => m.id === model)) {
      return model;
    }

    // Find default model for provider
    const defaultModel = availableModels.find(m => m.isDefault);
    if (defaultModel) {
      return defaultModel.id;
    }

    // Fallback to first available model
    return availableModels[0]?.id || (provider === 'google' ? 'gemini-2.5-flash' : 'llama-3.1-8b-instruct');
  }

  async testConnection(settings: AISettings): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      if (settings.provider === 'google') {
        return await this.testGoogleConnection(settings);
      } else if (settings.provider === 'custom') {
        return await this.testCustomConnection(settings);
      } else {
        return { success: false, message: 'Unsupported provider' };
      }
    } catch (error) {
      return { 
        success: false, 
        message: 'Connection test failed', 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async testGoogleConnection(settings: AISettings): Promise<{ success: boolean; message: string }> {
    if (!settings.apiKey) {
      return { success: false, message: 'API key required' };
    }

    try {
      // Simple test to validate API key
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: {
          'x-goog-api-key': settings.apiKey
        }
      });

      if (response.ok) {
        return { success: true, message: 'Google AI connection successful' };
      } else {
        const error = await response.text();
        return { success: false, message: `Google AI error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: 'Google AI connection failed' };
    }
  }

  private async testCustomConnection(settings: AISettings): Promise<{ success: boolean; message: string }> {
    if (!settings.baseUrl) {
      return { success: false, message: 'Base URL required for custom provider' };
    }

    try {
      const response = await fetch(`${settings.baseUrl}/models`, {
        headers: settings.apiKey ? {
          'Authorization': `Bearer ${settings.apiKey}`
        } : {}
      });

      if (response.ok) {
        return { success: true, message: 'Custom provider connection successful' };
      } else {
        return { success: false, message: `Custom provider error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: 'Custom provider connection failed' };
    }
  }
}
