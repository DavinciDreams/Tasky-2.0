import { TaskSchema, IssueCategory, Priority, ProjectType } from '../core/types';
import { Result, Success, Failure } from '../core/functional';
import * as fs from 'fs-extra';
import * as path from 'path';
import { homedir } from 'os';

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: IssueCategory;
  priority: Priority;
  template: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: Priority;
    affectedFiles?: string[];
  };
  projectTypes?: ProjectType[];
  isBuiltIn: boolean;
}

export class TaskTemplateManager {
  private static instance: TaskTemplateManager;
  private templatesPath: string;
  private templates: Map<string, TaskTemplate> = new Map();

  private constructor() {
    const looperDir = path.join(homedir(), '.looper-cli');
    this.templatesPath = path.join(looperDir, 'templates.json');

    // Initialize with built-in templates
    this.initializeBuiltInTemplates();

    // Load custom templates
    this.loadCustomTemplates();
  }

  static getInstance(): TaskTemplateManager {
    if (!TaskTemplateManager.instance) {
      TaskTemplateManager.instance = new TaskTemplateManager();
    }
    return TaskTemplateManager.instance;
  }

  private initializeBuiltInTemplates(): void {
    const builtInTemplates: TaskTemplate[] = [
      {
        id: 'bug-fix',
        name: 'Bug Fix',
        description: 'Report and fix a bug in the codebase',
        icon: '🐛',
        category: IssueCategory.BACKEND,
        priority: Priority.HIGH,
        template: {
          title: 'Fix bug: ',
          description: `## Bug Description
[Describe the bug]

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- OS: 
- Version: 
- Browser (if applicable): `,
          category: IssueCategory.BACKEND,
          priority: Priority.HIGH,
          affectedFiles: []
        },
        isBuiltIn: true
      },
      {
        id: 'feature-request',
        name: 'Feature Request',
        description: 'Request a new feature or enhancement',
        icon: '✨',
        category: IssueCategory.FRONTEND,
        priority: Priority.MEDIUM,
        template: {
          title: 'Feature: ',
          description: `## Feature Description
[Describe the feature]

## Use Case
[Why is this feature needed?]

## Proposed Solution
[How should it work?]

## Alternatives Considered
[Other approaches]`,
          category: IssueCategory.FRONTEND,
          priority: Priority.MEDIUM,
          affectedFiles: []
        },
        isBuiltIn: true
      },
      {
        id: 'performance',
        name: 'Performance Issue',
        description: 'Report performance problems or optimization needs',
        icon: '⚡',
        category: IssueCategory.BACKEND,
        priority: Priority.HIGH,
        template: {
          title: 'Performance: Optimize ',
          description: `## Performance Issue
[Describe the performance problem]

## Current Metrics
- Load time: 
- Memory usage: 
- CPU usage: 

## Expected Performance
[Target metrics]

## Profiling Results
[Any profiling data]`,
          category: IssueCategory.BACKEND,
          priority: Priority.HIGH,
          affectedFiles: []
        },
        isBuiltIn: true
      },
      {
        id: 'security',
        name: 'Security Issue',
        description: 'Report security vulnerabilities or concerns',
        icon: '🔒',
        category: IssueCategory.BACKEND,
        priority: Priority.CRITICAL,
        template: {
          title: 'Security: ',
          description: `## Security Issue
⚠️ If this is a critical vulnerability, please report privately first!

## Issue Description
[Describe the security concern]

## Impact
[Potential impact if exploited]

## Steps to Reproduce
[If applicable]

## Suggested Fix
[Proposed solution]`,
          category: IssueCategory.BACKEND,
          priority: Priority.CRITICAL,
          affectedFiles: []
        },
        isBuiltIn: true
      },
      {
        id: 'refactor',
        name: 'Code Refactoring',
        description: 'Improve code quality without changing functionality',
        icon: '🔧',
        category: IssueCategory.BACKEND,
        priority: Priority.LOW,
        template: {
          title: 'Refactor: ',
          description: `## Refactoring Goal
[What needs to be refactored and why]

## Current Implementation
[Brief description of current code]

## Proposed Changes
[How to improve it]

## Benefits
- [ ] Better readability
- [ ] Improved performance
- [ ] Easier testing
- [ ] Reduced complexity`,
          category: IssueCategory.BACKEND,
          priority: Priority.LOW,
          affectedFiles: []
        },
        isBuiltIn: true
      },
      {
        id: 'documentation',
        name: 'Documentation',
        description: 'Add or improve documentation',
        icon: '📚',
        category: IssueCategory.CONFIG,
        priority: Priority.LOW,
        template: {
          title: 'Docs: ',
          description: `## Documentation Need
[What needs to be documented]

## Target Audience
[Who will read this documentation]

## Content to Cover
- [ ] 
- [ ] 
- [ ] 

## Format
- [ ] README
- [ ] API docs
- [ ] Tutorial
- [ ] Guide`,
          category: IssueCategory.CONFIG,
          priority: Priority.LOW,
          affectedFiles: []
        },
        isBuiltIn: true
      },
      {
        id: 'api-endpoint',
        name: 'API Endpoint',
        description: 'Add or modify API endpoints',
        icon: '🔌',
        category: IssueCategory.API,
        priority: Priority.MEDIUM,
        template: {
          title: 'API: ',
          description: `## Endpoint Details
- Method: GET/POST/PUT/DELETE
- Path: /api/v1/
- Purpose: 

## Request Format
\`\`\`json
{
  
}
\`\`\`

## Response Format
\`\`\`json
{
  
}
\`\`\`

## Error Handling
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Server Error`,
          category: IssueCategory.API,
          priority: Priority.MEDIUM,
          affectedFiles: ['src/api/']
        },
        isBuiltIn: true
      },
      {
        id: 'database-migration',
        name: 'Database Migration',
        description: 'Database schema changes or migrations',
        icon: '🗄️',
        category: IssueCategory.DATABASE,
        priority: Priority.HIGH,
        template: {
          title: 'DB Migration: ',
          description: `## Migration Purpose
[Why this change is needed]

## Schema Changes
\`\`\`sql
-- Add your SQL here
\`\`\`

## Data Migration
[Any data transformation needed]

## Rollback Plan
[How to undo if needed]

## Testing
- [ ] Migration tested locally
- [ ] Rollback tested
- [ ] Performance impact assessed`,
          category: IssueCategory.DATABASE,
          priority: Priority.HIGH,
          affectedFiles: []
        },
        isBuiltIn: true
      },
      {
        id: 'ui-component',
        name: 'UI Component',
        description: 'Create or modify UI components',
        icon: '🎨',
        category: IssueCategory.FRONTEND,
        priority: Priority.MEDIUM,
        template: {
          title: 'UI: ',
          description: `## Component Description
[What the component does]

## Design Requirements
- [ ] Responsive design
- [ ] Accessibility (WCAG 2.1)
- [ ] Dark mode support
- [ ] Loading states
- [ ] Error states

## Props/API
\`\`\`typescript
interface ComponentProps {
  
}
\`\`\`

## Usage Example
\`\`\`tsx
<Component />
\`\`\``,
          category: IssueCategory.FRONTEND,
          priority: Priority.MEDIUM,
          affectedFiles: ['src/components/']
        },
        projectTypes: [ProjectType.NODE_REACT],
        isBuiltIn: true
      },
      {
        id: 'test-coverage',
        name: 'Test Coverage',
        description: 'Add or improve test coverage',
        icon: '🧪',
        category: IssueCategory.BACKEND,
        priority: Priority.MEDIUM,
        template: {
          title: 'Tests: Add coverage for ',
          description: `## Testing Goals
[What needs to be tested]

## Test Cases
- [ ] Happy path
- [ ] Error cases
- [ ] Edge cases
- [ ] Integration tests

## Current Coverage
- File: X%
- Function: X%
- Line: X%

## Target Coverage
- File: X%
- Function: X%
- Line: X%`,
          category: IssueCategory.BACKEND,
          priority: Priority.MEDIUM,
          affectedFiles: ['tests/']
        },
        isBuiltIn: true
      }
    ];

    builtInTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get all available templates
   */
  getTemplates(projectType?: ProjectType): TaskTemplate[] {
    const templates = Array.from(this.templates.values());

    if (projectType) {
      return templates.filter(t => !t.projectTypes || t.projectTypes.includes(projectType));
    }

    return templates;
  }

  /**
   * Get a specific template
   */
  getTemplate(id: string): TaskTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Create a task from template
   */
  createFromTemplate(templateId: string, overrides: Partial<TaskSchema> = {}): Partial<TaskSchema> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return {
      title: template.template.title,
      description: template.template.description,
      category: template.category,
      priority: template.priority,
      affectedFiles: template.template.affectedFiles || [],
      ...overrides
    };
  }

  /**
   * Save a custom template
   */
  async saveCustomTemplate(
    template: Omit<TaskTemplate, 'isBuiltIn'>
  ): Promise<Result<TaskTemplate, string>> {
    try {
      const customTemplate: TaskTemplate = {
        ...template,
        isBuiltIn: false
      };

      this.templates.set(customTemplate.id, customTemplate);
      await this.saveCustomTemplates();

      return new Success(customTemplate);
    } catch (error) {
      return new Failure(`Failed to save template: ${error}`);
    }
  }

  /**
   * Delete a custom template
   */
  async deleteCustomTemplate(id: string): Promise<Result<void, string>> {
    const template = this.templates.get(id);

    if (!template) {
      return new Failure(`Template ${id} not found`);
    }

    if (template.isBuiltIn) {
      return new Failure('Cannot delete built-in templates');
    }

    this.templates.delete(id);
    await this.saveCustomTemplates();

    return new Success(undefined);
  }

  /**
   * Load custom templates from disk
   */
  private loadCustomTemplates(): void {
    try {
      if (fs.existsSync(this.templatesPath)) {
        const data = fs.readJsonSync(this.templatesPath);

        if (data.templates && Array.isArray(data.templates)) {
          data.templates.forEach((template: TaskTemplate) => {
            if (!template.isBuiltIn) {
              this.templates.set(template.id, template);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load custom templates:', error);
    }
  }

  /**
   * Save custom templates to disk
   */
  private async saveCustomTemplates(): Promise<void> {
    try {
      const customTemplates = Array.from(this.templates.values()).filter(t => !t.isBuiltIn);

      const data = {
        version: '1.0',
        lastSaved: new Date().toISOString(),
        templates: customTemplates
      };

      await fs.writeJson(this.templatesPath, data, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save custom templates:', error);
      throw error;
    }
  }
}
