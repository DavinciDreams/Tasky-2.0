/**
 * Chat Diagnostic Utility
 * Helps diagnose and fix common chat response issues
 */

export interface ChatDiagnostic {
  issue: string;
  severity: 'error' | 'warning' | 'info';
  fix?: string;
}

export function diagnoseChatSettings(settings: any): ChatDiagnostic[] {
  const issues: ChatDiagnostic[] = [];
  
  // Check if provider is set
  if (!settings.llmProvider) {
    issues.push({
      issue: 'No LLM provider selected',
      severity: 'error',
      fix: 'Select a provider (OpenAI, LM Studio, or Custom) in Chat Settings'
    });
  }
  
  // Check provider-specific requirements
  const provider = (settings.llmProvider || '').toLowerCase();
  
  if (provider === 'openai') {
    if (!settings.llmApiKey || settings.llmApiKey.trim() === '') {
      issues.push({
        issue: 'OpenAI API key is missing',
        severity: 'error',
        fix: 'Add your OpenAI API key in Settings → Chat Settings'
      });
    }
    
    if (!settings.llmModel) {
      issues.push({
        issue: 'No OpenAI model selected',
        severity: 'warning',
        fix: 'Model will default to o4-mini, but you can select a specific model'
      });
    }
  }
  
  if (provider === 'lm-studio' || provider === 'custom') {
    if (!settings.llmBaseUrl || settings.llmBaseUrl.trim() === '') {
      issues.push({
        issue: `${provider === 'lm-studio' ? 'LM Studio' : 'Custom'} base URL is missing`,
        severity: 'error',
        fix: `Set the base URL in Settings (e.g., http://localhost:1234/v1 for LM Studio)`
      });
    }
  }
  
  // Check if provider is supported
  const supportedProviders = ['openai', 'lm-studio', 'custom'];
  if (provider && !supportedProviders.includes(provider)) {
    issues.push({
      issue: `Provider "${provider}" is not supported`,
      severity: 'error',
      fix: 'Select OpenAI, LM Studio, or Custom as your provider'
    });
  }
  
  return issues;
}

export function getRecommendedSettings() {
  return {
    // Default to OpenAI with o4-mini for best compatibility
    llmProvider: 'openai',
    llmModel: 'o4-mini',
    llmApiKey: '', // User needs to set this
    llmBaseUrl: '', // Only needed for LM Studio/Custom
    llmUseCustomPrompt: false,
    llmSystemPrompt: '' // Will use Tasky default
  };
}
