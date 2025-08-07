import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { AgentProvider } from '../core/agent-executor';

export interface AgentConfiguration {
  provider: AgentProvider;
  enabled: boolean;
  command?: string;
  apiKey?: string;
  modelName?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface LooperConfig {
  agents: {
    claude: AgentConfiguration;
    gemini: AgentConfiguration;
  };
  execution: {
    defaultTimeout: number;
    maxRetries: number;
    streamOutput: boolean;
  };
  features: {
    autoCommit: boolean;
    createBranches: boolean;
    openPullRequests: boolean;
  };
}

// Default configuration
const defaultConfig: LooperConfig = {
  agents: {
    claude: {
      provider: AgentProvider.CLAUDE,
      enabled: true,
      command: 'claude',
      modelName: 'claude-4-sonnet',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 300000 // 5 minutes
    },
    gemini: {
      provider: AgentProvider.GEMINI,
      enabled: true,
      command: 'gemini',
      modelName: 'gemini-pro',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 300000 // 5 minutes
    }
  },
  execution: {
    defaultTimeout: 300000, // 5 minutes
    maxRetries: 3,
    streamOutput: true
  },
  features: {
    autoCommit: false,
    createBranches: false,
    openPullRequests: false
  }
};

export class AgentConfigManager {
  private static instance: AgentConfigManager;
  private config: LooperConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(os.homedir(), '.looper-cli', 'config.json');
    this.config = this.loadConfig();
  }

  static getInstance(): AgentConfigManager {
    if (!AgentConfigManager.instance) {
      AgentConfigManager.instance = new AgentConfigManager();
    }
    return AgentConfigManager.instance;
  }

  private loadConfig(): LooperConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readJsonSync(this.configPath);
        // Merge with defaults to ensure all fields exist
        return this.mergeWithDefaults(data);
      }
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
    }

    // Create default config file
    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  private mergeWithDefaults(userConfig: any): LooperConfig {
    // Deep merge user config with defaults
    return {
      agents: {
        claude: { ...defaultConfig.agents.claude, ...userConfig.agents?.claude },
        gemini: { ...defaultConfig.agents.gemini, ...userConfig.agents?.gemini }
      },
      execution: { ...defaultConfig.execution, ...userConfig.execution },
      features: { ...defaultConfig.features, ...userConfig.features }
    };
  }

  private saveConfig(config: LooperConfig): void {
    try {
      fs.ensureDirSync(path.dirname(this.configPath));
      fs.writeJsonSync(this.configPath, config, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  getConfig(): LooperConfig {
    return this.config;
  }

  getAgentConfig(provider: AgentProvider): AgentConfiguration | undefined {
    switch (provider) {
      case AgentProvider.CLAUDE:
        return this.config.agents.claude;
      case AgentProvider.GEMINI:
        return this.config.agents.gemini;
      default:
        return undefined;
    }
  }

  updateAgentConfig(provider: AgentProvider, updates: Partial<AgentConfiguration>): void {
    const agentConfig = this.getAgentConfig(provider);
    if (agentConfig) {
      Object.assign(agentConfig, updates);
      this.saveConfig(this.config);
    }
  }

  updateExecutionConfig(updates: Partial<LooperConfig['execution']>): void {
    Object.assign(this.config.execution, updates);
    this.saveConfig(this.config);
  }

  updateFeatures(updates: Partial<LooperConfig['features']>): void {
    Object.assign(this.config.features, updates);
    this.saveConfig(this.config);
  }

  // Check if any real agents are available
  hasRealAgents(): boolean {
    return (
      (this.config.agents.claude.enabled && !!this.config.agents.claude.apiKey) ||
      (this.config.agents.gemini.enabled && !!this.config.agents.gemini.apiKey)
    );
  }

  // Get environment variables for agent execution
  getAgentEnv(provider: AgentProvider): Record<string, string> {
    const agentConfig = this.getAgentConfig(provider);
    const env: Record<string, string> = {};

    if (agentConfig?.apiKey) {
      switch (provider) {
        case AgentProvider.CLAUDE:
          env.CLAUDE_API_KEY = agentConfig.apiKey;
          break;
        case AgentProvider.GEMINI:
          env.GEMINI_API_KEY = agentConfig.apiKey;
          break;
      }
    }

    return env;
  }
}
