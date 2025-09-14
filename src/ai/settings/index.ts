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
      model: 'gemini-1.5-flash', // Use 1.5-flash as default
      temperature: 1.0,
      maxTokens: 4096,
      systemPrompt: this.getDefaultSystemPrompt(),
      useCustomPrompt: true // Always use the default prompt
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
    } else if (!['google', 'lmstudio'].includes(settings.provider)) {
      errors.push('AI provider must be either "google" or "lmstudio"');
    }

    // API Key validation
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      if (settings.provider === 'google') {
        errors.push('Google AI API key is required');
        suggestions.push('Get your API key from https://aistudio.google.com/app/apikey');
      } else if (settings.provider === 'lmstudio') {
        // LM Studio typically uses a placeholder API key like "lm-studio"
        warnings.push('LM Studio usually uses "lm-studio" as API key');
        suggestions.push('Use "lm-studio" as the API key for local LM Studio instances');
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

    // Base URL validation for LM Studio providers
    if (settings.provider === 'lmstudio') {
      if (!settings.baseUrl || settings.baseUrl.trim() === '') {
        // Set default LM Studio URL
        suggestions.push('Default LM Studio URL: http://localhost:1234/v1');
        warnings.push('Using default LM Studio URL. Make sure LM Studio server is running.');
      } else {
        try {
          new URL(settings.baseUrl);
          // Validate it looks like an LM Studio URL
          if (!settings.baseUrl.includes('localhost') && !settings.baseUrl.includes('127.0.0.1')) {
            warnings.push('LM Studio typically runs on localhost. Verify your server address.');
          }
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
      case 'lmstudio':
        return this.getLMStudioModels();
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
        description: 'Fast and efficient for most tasks',
        capabilities: baseCapabilities,
        isDefault: false,
        isRecommended: false
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
        id: 'gemini-1.5-flash-latest',
        name: 'Gemini 1.5 Flash Latest',
        description: 'Latest 1.5 Flash model - recommended',
        capabilities: baseCapabilities,
        isDefault: true,
        isRecommended: true
      },
      {
        id: 'gemini-1.5-flash-8b-latest',
        name: 'Gemini 1.5 Flash 8B Latest',
        description: 'Smallest and fastest model',
        capabilities: { ...baseCapabilities, maxContextLength: 100000 }
      }
    ];
  }

  private getLMStudioModels(): AIModelInfo[] {
    // Return empty array for LM Studio - models will be fetched dynamically
    // This is because LM Studio models are loaded dynamically and we need to
    // query the API to get the actual available models
    return [];
  }

  async getLMStudioModelsFromAPI(baseUrl: string = 'http://127.0.0.1:1234', apiKey?: string): Promise<AIModelInfo[]> {
    const lmstudioCapabilities: AIProviderCapabilities = {
      supportsStreaming: true,
      supportsTools: true, // LM Studio supports tools through OpenAI compatibility
      supportsImages: false, // Depends on the loaded model
      supportsObjectGeneration: true, // LM Studio supports structured output
      supportsSearch: false,
      supportsUrlContext: false,
      maxContextLength: 8192 // Varies by model
    };

    try {
      const response = await fetch(`${baseUrl}/v1/models`, {
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        const models = data?.data || [];
        
        return models.map((model: any, index: number) => ({
          id: model.id,
          name: this.formatModelName(model.id),
          description: `Model loaded in LM Studio: ${model.id}`,
          capabilities: lmstudioCapabilities,
          isDefault: index === 0, // First model is default
          isRecommended: index === 0
        }));
      } else {
        console.warn('Failed to fetch LM Studio models:', response.status);
        return [];
      }
    } catch (error) {
      console.warn('Error fetching LM Studio models:', error);
      return [];
    }
  }

  private formatModelName(modelId: string): string {
    // Convert model ID to a user-friendly name
    // e.g., "llama-3.2-1b-instruct" -> "Llama 3.2 1B Instruct"
    return modelId
      .split('-')
      .map(part => {
        // Capitalize first letter of each part
        if (part.match(/^\d+(\.\d+)?$/)) return part; // Keep numbers as-is
        if (part === 'instruct') return 'Instruct';
        if (part === 'chat') return 'Chat';
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
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
      return this.getLMStudioModels()[0].capabilities;
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
      systemPrompt: this.getDefaultSystemPrompt(), // Always use default prompt
      useCustomPrompt: true // Always true since we always use the default prompt
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
      } else if (settings.provider === 'lmstudio') {
        return await this.testLMStudioConnection(settings);
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

  private async testLMStudioConnection(settings: AISettings): Promise<{ success: boolean; message: string }> {
    const baseUrl = settings.baseUrl || 'http://localhost:1234/v1';
    
    try {
      // Test LM Studio's /v1/models endpoint
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey && { 'Authorization': `Bearer ${settings.apiKey}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        const modelCount = data?.data?.length || 0;
        return { 
          success: true, 
          message: `LM Studio connection successful. Found ${modelCount} model(s).` 
        };
      } else if (response.status === 404) {
        return { 
          success: false, 
          message: 'LM Studio server not found. Make sure LM Studio is running and server is started.' 
        };
      } else {
        return { 
          success: false, 
          message: `LM Studio error: ${response.status}. Check if server is properly configured.` 
        };
      }
    } catch (error) {
      if ((error as any)?.code === 'ECONNREFUSED') {
        return { 
          success: false, 
          message: 'Cannot connect to LM Studio. Please start LM Studio and enable the server.' 
        };
      }
      return { 
        success: false, 
        message: 'LM Studio connection failed. Check if the server is running on the correct port.' 
      };
    }
  }
}
