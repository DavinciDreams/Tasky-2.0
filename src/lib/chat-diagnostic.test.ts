import { describe, it, expect } from 'vitest';
import { diagnoseChatSettings, getRecommendedSettings } from './chat-diagnostic';

describe('diagnoseChatSettings()', () => {
  it('returns error when no provider is set', () => {
    const issues = diagnoseChatSettings({});
    const providerIssue = issues.find(i => i.issue.includes('No LLM provider'));
    expect(providerIssue).toBeDefined();
    expect(providerIssue!.severity).toBe('error');
  });

  it('returns error for OpenAI without API key', () => {
    const issues = diagnoseChatSettings({ llmProvider: 'openai' });
    const keyIssue = issues.find(i => i.issue.includes('API key'));
    expect(keyIssue).toBeDefined();
    expect(keyIssue!.severity).toBe('error');
  });

  it('returns warning for OpenAI without model', () => {
    const issues = diagnoseChatSettings({ llmProvider: 'openai', llmApiKey: 'sk-test' });
    const modelIssue = issues.find(i => i.issue.includes('No OpenAI model'));
    expect(modelIssue).toBeDefined();
    expect(modelIssue!.severity).toBe('warning');
  });

  it('returns no key error when OpenAI API key is provided', () => {
    const issues = diagnoseChatSettings({
      llmProvider: 'openai',
      llmApiKey: 'sk-test',
      llmModel: 'gpt-4',
    });
    const keyIssue = issues.find(i => i.issue.includes('API key'));
    expect(keyIssue).toBeUndefined();
  });

  it('returns error for custom provider without base URL', () => {
    const issues = diagnoseChatSettings({ llmProvider: 'custom' });
    const urlIssue = issues.find(i => i.issue.includes('base URL'));
    expect(urlIssue).toBeDefined();
    expect(urlIssue!.severity).toBe('error');
  });

  it('returns no URL error when custom base URL is provided', () => {
    const issues = diagnoseChatSettings({
      llmProvider: 'custom',
      llmBaseUrl: 'http://localhost:1234',
    });
    const urlIssue = issues.find(i => i.issue.includes('base URL'));
    expect(urlIssue).toBeUndefined();
  });

  it('returns error for unsupported provider', () => {
    const issues = diagnoseChatSettings({ llmProvider: 'unsupported-xyz' });
    const provIssue = issues.find(i => i.issue.includes('not supported'));
    expect(provIssue).toBeDefined();
  });

  it('returns no issues for valid OpenAI configuration', () => {
    const issues = diagnoseChatSettings({
      llmProvider: 'openai',
      llmApiKey: 'sk-valid',
      llmModel: 'gpt-4',
    });
    expect(issues.length).toBe(0);
  });
});

describe('getRecommendedSettings()', () => {
  it('returns expected default settings', () => {
    const settings = getRecommendedSettings();
    expect(settings.llmProvider).toBe('openai');
    expect(settings.llmModel).toBe('o4-mini');
    expect(settings.llmApiKey).toBe('');
    expect(settings.llmBaseUrl).toBe('');
    expect(settings.llmUseCustomPrompt).toBe(false);
    expect(settings.llmSystemPrompt).toBe('');
  });
});
