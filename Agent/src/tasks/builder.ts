import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import { RepoContext, TaskSchema, IssueCategory, Priority, ProjectType, Task } from '../core/types';
import { Maybe } from '../core/functional';
import { BeautifulTUI } from '../ui/beautiful-tui';
import { TaskTemplateManager } from './templates';
import { showCustomMenu, CustomMenuSection } from '../ui/custom-menu';
import { TaskStore } from './task-store';
import { Result, Failure } from '../core/functional';

export interface TaskEssentials {
  title: string;
  description: string;
  category: IssueCategory;
  priority: Priority;
}

export interface TaskDetails {
  affectedFiles?: string[];
}

export class TaskBuilder {
  private static currentRepoContext: RepoContext;
  private static instance: TaskBuilder;
  private templateManager = TaskTemplateManager.getInstance();
  private taskStore = TaskStore.getInstance();

  private constructor() {}

  static getInstance(): TaskBuilder {
    if (!TaskBuilder.instance) {
      TaskBuilder.instance = new TaskBuilder();
    }
    return TaskBuilder.instance;
  }

  /**
   * Smart task creation with minimal required fields
   */
  static async buildInteractively(repoContext: RepoContext): Promise<Maybe<TaskSchema>> {
    // Store the repo context for later use
    this.currentRepoContext = repoContext;

    // Prepare subtitle for the custom menu
    const subtitle = `${repoContext.rootPath} • ${repoContext.currentBranch}`;

    try {
      // Step 1: Quick or Detailed?
      const sections: CustomMenuSection[] = [
        {
          items: [
            {
              name: 'Quick Mode',
              value: 'quick',
              icon: '⚡',
              description: 'Just the essentials'
            },
            {
              name: 'From Template',
              value: 'template',
              icon: '📋',
              description: 'Pre-filled common tasks'
            },
            {
              name: 'Detailed Mode',
              value: 'detailed',
              icon: '📝',
              description: 'All fields'
            },
            {
              name: 'Back to Main Menu',
              value: 'cancel',
              icon: '🔙',
              description: 'Return to main'
            }
          ]
        }
      ];

      const result = await showCustomMenu(sections, 'Create New Task', subtitle);

      if (result === 'cancel') {
        return Maybe.none();
      }

      if (result === 'template') {
        return this.buildFromTemplateInteractive(repoContext);
      }

      // For both quick and detailed modes, start with essentials
      console.log('\n' + chalk.bold('📝 Essential Information\n'));

      const essentials = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'What needs to be done?',
          prefix: chalk.cyan('  →'),
          validate: (input: string) => input.trim().length > 0 || 'Please describe the task'
        },
        {
          type: 'list',
          name: 'priority',
          message: ' ', // Empty message to suppress "(Use arrow keys)"
          prefix: chalk.cyan('  → How urgent is this?'),
          choices: [
            { name: '🔥 Critical - Drop everything!', value: Priority.CRITICAL },
            { name: '🔴 High - Important', value: Priority.HIGH },
            { name: '🟡 Medium - Normal priority', value: Priority.MEDIUM },
            { name: '🟢 Low - When you get time', value: Priority.LOW }
          ],
          default: Priority.MEDIUM
        }
      ]);

      // Smart category detection based on title
      const suggestedCategory = this.detectCategory(essentials.title, repoContext);

      const { category } = await inquirer.prompt([
        {
          type: 'list',
          name: 'category',
          message: ' ', // Empty message to suppress "(Use arrow keys)"
          prefix: chalk.cyan('  → What type of task?'),
          choices: Object.values(IssueCategory).map(cat => ({
            name: `${this.getCategoryIcon(cat)} ${cat}`,
            value: cat
          })),
          default: suggestedCategory
        }
      ]);

      // For quick mode, we're done with questions!
      if (result === 'quick') {
        const taskSchema: TaskSchema = {
          id: `task_${Date.now()}_${uuidv4().slice(0, 8)}`,
          title: essentials.title,
          description: '',
          category,
          affectedFiles: [],

          priority: essentials.priority,
          createdAt: new Date()
        };

        return this.confirmAndCreate(taskSchema, 'quick');
      }

      // Detailed mode - ask for more info
      console.log('\n' + chalk.bold('📋 Additional Details (optional)\n'));

      const details = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: 'Add more context (press Enter to skip):',
          prefix: chalk.cyan('  →'),
          default: ''
        },
        {
          type: 'checkbox',
          name: 'affectedFiles',
          message: 'Select affected files:',
          prefix: chalk.cyan('  →'),
          choices: this.getSmartFileChoices(repoContext, essentials.title),
          pageSize: 10,
          when: () => repoContext.modifiedFiles.length > 0
        },
        {
          type: 'input',
          name: 'tags',
          message: 'Tags (comma-separated):',
          prefix: chalk.cyan('  →'),
          default: this.generateTags(essentials.title, category).join(', '),
          filter: (input: string) =>
            input
              .split(',')
              .map(s => s.trim())
              .filter(s => s)
        }
      ]);

      const taskSchema: TaskSchema = {
        id: `task_${Date.now()}_${uuidv4().slice(0, 8)}`,
        title: essentials.title,
        description: details.description || '',
        category,
        affectedFiles: details.affectedFiles || [],

        priority: essentials.priority,
        createdAt: new Date()
      };

      return this.confirmAndCreate(taskSchema, 'detailed');
    } catch (error) {
      BeautifulTUI.showError(`Task creation failed: ${error}`);
      return Maybe.none();
    }
  }

  /**
   * Build from template with interactive selection
   */
  private static async buildFromTemplateInteractive(
    repoContext: RepoContext
  ): Promise<Maybe<TaskSchema>> {
    const templateManager = TaskTemplateManager.getInstance();
    const templates = templateManager.getTemplates(repoContext.projectType);

    // Clear and show header
    console.clear();
    const width = process.stdout.columns || 80;

    console.log('\n\n');
    const title = 'Select Template';
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(' '.repeat(Math.max(0, titlePadding)) + chalk.bold.cyan(title));

    console.log(
      '\n' + ' '.repeat(Math.floor((width - 60) / 2)) + chalk.gray('─'.repeat(60)) + '\n'
    );

    const promptText = 'Choose a template:';
    const promptPadding = Math.floor((width - promptText.length) / 2);
    console.log(' '.repeat(Math.max(0, promptPadding)) + chalk.cyan(promptText));
    console.log();

    const sections: CustomMenuSection[] = [
      {
        title: 'Available Templates',
        items: templates.slice(0, 8).map(t => ({
          name: t.name,
          value: t.id,
          icon: t.icon,
          description: t.description
        }))
      },
      {
        items: [{ name: 'Back', value: 'back', icon: '←', description: 'Return to options' }]
      }
    ];

    const result = await showCustomMenu(sections, 'Select Template', '');

    if (result === 'back') {
      return this.buildInteractively(repoContext);
    }

    const templateId = result;

    const template = templateManager.getTemplate(templateId);
    if (!template) return Maybe.none();

    // Get template data
    const templateData = templateManager.createFromTemplate(templateId);

    console.log('\n' + chalk.bold('✏️ Customize Your Task\n'));

    // Let user customize the template
    const customization = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Task title:',
        prefix: chalk.cyan('  →'),
        default: templateData.title,
        validate: (input: string) => input.trim().length > 0 || 'Title is required'
      },
      {
        type: 'editor',
        name: 'description',
        message: 'Edit description (press Enter to open editor):',
        prefix: chalk.cyan('  →'),
        default: templateData.description,
        when: (_answers: any) => {
          // Ask to edit description only if user wants to
          return inquirer
            .prompt([
              {
                type: 'confirm',
                name: 'editDesc',
                message: 'Would you like to edit the description?',
                prefix: chalk.cyan('  →'),
                default: false
              }
            ])
            .then(a => a.editDesc);
        }
      }
    ]);

    const taskSchema: TaskSchema = {
      id: `task_${Date.now()}_${uuidv4().slice(0, 8)}`,
      title: customization.title,
      description: customization.description || templateData.description || '',
      category: templateData.category || IssueCategory.BACKEND,
      affectedFiles: templateData.affectedFiles || [],

      priority: templateData.priority || Priority.MEDIUM,
      createdAt: new Date()
    };

    return this.confirmAndCreate(taskSchema, 'template');
  }

  /**
   * Show preview and confirm creation
   */
  private static async confirmAndCreate(
    task: TaskSchema,
    mode: string
  ): Promise<Maybe<TaskSchema>> {
    console.clear();

    // Beautiful preview
    const width = process.stdout.columns || 80;
    console.log('\n' + chalk.cyan('━'.repeat(width)));
    console.log(chalk.bold.white('  📋 Task Preview'));
    console.log(chalk.cyan('━'.repeat(width)) + '\n');

    // Show key info in a nice format
    console.log(chalk.gray('  Title:    ') + chalk.white.bold(task.title));
    console.log(
      chalk.gray('  Priority: ') + this.getPriorityDisplay(task.priority || Priority.MEDIUM)
    );
    console.log(
      chalk.gray('  Category: ') +
        `${this.getCategoryIcon(task.category || IssueCategory.FRONTEND)} ${task.category || IssueCategory.FRONTEND}`
    );

    if (task.affectedFiles && task.affectedFiles.length > 0) {
      console.log(chalk.gray('  Files:    ') + chalk.yellow(task.affectedFiles.length + ' files'));
    }

    if (task.description) {
      console.log('\n' + chalk.gray('  Description:'));
      console.log(chalk.white('  ' + task.description.split('\n').join('\n  ')));
    }

    console.log('\n' + chalk.cyan('━'.repeat(width)) + '\n');

    // Show action menu
    const promptText =
      mode === 'quick' ? 'Task ready! What would you like to do?' : 'Review your task:';
    const actionPromptPadding = Math.floor((width - promptText.length) / 2);
    console.log(' '.repeat(Math.max(0, actionPromptPadding)) + chalk.cyan(promptText));
    console.log();

    const actionSections: CustomMenuSection[] = [
      {
        items: [
          { name: 'Create Task', value: 'create', icon: '✅', description: 'Save this task' },
          { name: 'Edit Again', value: 'edit', icon: '✏️', description: 'Make changes' },
          { name: 'Cancel', value: 'cancel', icon: '❌', description: 'Discard task' }
        ]
      }
    ];

    const action = await showCustomMenu(actionSections, 'Review Task', '');

    if (action === 'create') {
      return Maybe.of(task);
    } else if (action === 'edit') {
      // Go back to detailed mode - reuse the original context
      return this.buildInteractively(this.currentRepoContext);
    }

    return Maybe.none();
  }

  /**
   * Detect category based on title keywords
   */
  private static detectCategory(title: string, _repoContext: RepoContext): IssueCategory {
    const lower = title.toLowerCase();

    // Frontend keywords
    if (
      lower.match(
        /\b(ui|ux|style|css|design|layout|responsive|component|react|vue|angular|frontend)\b/
      )
    ) {
      return IssueCategory.FRONTEND;
    }

    // API keywords
    if (lower.match(/\b(api|endpoint|rest|graphql|request|response|route)\b/)) {
      return IssueCategory.API;
    }

    // Database keywords
    if (lower.match(/\b(database|db|sql|query|migration|schema|table|index)\b/)) {
      return IssueCategory.DATABASE;
    }

    // Config keywords
    if (lower.match(/\b(config|configuration|setting|env|environment|setup)\b/)) {
      return IssueCategory.CONFIG;
    }

    // Default to backend
    return IssueCategory.BACKEND;
  }

  /**
   * Generate smart tags based on title and category
   */
  private static generateTags(title: string, category: IssueCategory): string[] {
    const tags: string[] = [];
    const lower = title.toLowerCase();

    // Add category as tag
    tags.push(category.toLowerCase());

    // Common keywords
    if (lower.includes('bug') || lower.includes('fix')) tags.push('bug');
    if (lower.includes('feature') || lower.includes('add')) tags.push('feature');
    if (lower.includes('performance') || lower.includes('optimize')) tags.push('performance');
    if (lower.includes('security')) tags.push('security');
    if (lower.includes('test')) tags.push('testing');
    if (lower.includes('refactor')) tags.push('refactor');
    if (lower.includes('doc')) tags.push('documentation');

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Get smart file choices based on context
   */
  private static getSmartFileChoices(repoContext: RepoContext, title: string): any[] {
    const choices: any[] = [];

    // Always show recently modified files first
    if (repoContext.modifiedFiles.length > 0) {
      choices.push(new inquirer.Separator(chalk.yellow('── Recently Modified ──')));
      repoContext.modifiedFiles.slice(0, 5).forEach(file => {
        choices.push({
          name: `🔄 ${file}`,
          value: file,
          checked: true
        });
      });
    }

    // Add suggested files based on title
    const suggestedFiles = this.suggestFilesFromTitle(title, repoContext.projectType);
    if (suggestedFiles.length > 0) {
      choices.push(new inquirer.Separator(chalk.blue('── Suggested Files ──')));
      suggestedFiles.forEach(file => {
        if (!repoContext.modifiedFiles.includes(file)) {
          choices.push({
            name: `💡 ${file}`,
            value: file
          });
        }
      });
    }

    return choices;
  }

  /**
   * Suggest files based on task title
   */
  private static suggestFilesFromTitle(title: string, projectType: ProjectType): string[] {
    const lower = title.toLowerCase();
    const suggestions: string[] = [];

    if (projectType === ProjectType.NODE_REACT) {
      if (lower.includes('component')) suggestions.push('src/components/');
      if (lower.includes('hook')) suggestions.push('src/hooks/');
      if (lower.includes('api')) suggestions.push('src/api/', 'src/services/');
      if (lower.includes('style')) suggestions.push('src/styles/', 'src/index.css');
    }

    return suggestions.slice(0, 3); // Limit suggestions
  }

  private static getCategoryIcon(category: IssueCategory): string {
    const icons = {
      [IssueCategory.FRONTEND]: '🎨',
      [IssueCategory.BACKEND]: '⚙️',
      [IssueCategory.DATABASE]: '🗄️',
      [IssueCategory.API]: '🔌',
      [IssueCategory.CONFIG]: '⚙️'
    };
    return icons[category] || '📄';
  }

  private static getPriorityDisplay(priority: Priority): string {
    const displays = {
      [Priority.CRITICAL]: chalk.red.bold('🔥 Critical'),
      [Priority.HIGH]: chalk.red('🔴 High'),
      [Priority.MEDIUM]: chalk.yellow('🟡 Medium'),
      [Priority.LOW]: chalk.green('🟢 Low')
    };
    return displays[priority] || priority.toString();
  }

  /**
   * Legacy method for compatibility
   */
  static async buildFromTemplate(
    _template: string,
    repoContext: RepoContext
  ): Promise<Maybe<TaskSchema>> {
    return this.buildFromTemplateInteractive(repoContext);
  }

  /**
   * Build a task step by step with smart defaults
   */
  async buildTask(): Promise<Result<Task, string>> {
    try {
      console.clear();
      console.log(chalk.bold.cyan('\n🛠️  Task Builder\n'));
      console.log(chalk.gray("Let's create a new task step by step...\n"));

      // Step 1: Gather essentials
      const essentials = await this.gatherEssentials();

      // Step 2: Smart analysis and suggestions
      await this.analyzeAndSuggest();

      // Step 3: Gather additional details
      const details = await this.gatherDetails();

      // Step 4: Create the task
      const taskSchema = this.buildTaskSchema(essentials, details);

      // Step 5: Review and confirm
      const confirmed = await this.reviewTask(taskSchema);
      if (!confirmed) {
        return new Failure('Task creation cancelled');
      }

      // Step 6: Create the task
      const result = await this.taskStore.create(taskSchema);
      if (result.isSuccess()) {
        console.log(chalk.green('\n✅ Task created successfully!'));
        this.showTaskSummary(result.getValue());
      }

      return result;
    } catch (error) {
      return new Failure(`Failed to build task: ${error}`);
    }
  }

  /**
   * Create a task from template with customization
   */
  async createFromTemplate(
    templateId: string,
    customizations?: Partial<TaskSchema>
  ): Promise<Result<Task, string>> {
    try {
      const template = this.templateManager.getTemplate(templateId);
      if (!template) {
        return new Failure(`Template ${templateId} not found`);
      }

      console.clear();
      console.log(chalk.bold.cyan(`\n📋 Creating task from template: ${template.name}\n`));

      // Get base task from template
      const baseTask = this.templateManager.createFromTemplate(templateId, customizations);

      // Allow user to customize
      const essentials: TaskEssentials = {
        title: baseTask.title || '',
        description: baseTask.description || '',
        category: baseTask.category || IssueCategory.FRONTEND,
        priority: baseTask.priority || Priority.MEDIUM
      };

      const details: TaskDetails = {
        affectedFiles: baseTask.affectedFiles || []
      };

      // Build final schema
      const taskSchema = this.buildTaskSchema(essentials, details);

      // Create the task
      const result = await this.taskStore.create(taskSchema);
      if (result.isSuccess()) {
        console.log(chalk.green('\n✅ Task created from template!'));
        this.showTaskSummary(result.getValue());
      }

      return result;
    } catch (error) {
      return new Failure(`Failed to create task from template: ${error}`);
    }
  }

  /**
   * Gather essential task information
   */
  private async gatherEssentials(): Promise<TaskEssentials> {
    console.log(chalk.yellow('📝 Essential Information'));
    console.log(chalk.gray('Please provide the basic details for your task:\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Task title:',
        validate: (input: string) => input.trim().length > 0 || 'Title is required'
      },
      {
        type: 'editor',
        name: 'description',
        message: 'Task description:',
        default: 'Describe what needs to be done...',
        validate: (input: string) => input.trim().length > 0 || 'Description is required'
      },
      {
        type: 'list',
        name: 'category',
        message: 'Task category:',
        choices: Object.values(IssueCategory).map(cat => ({
          name: cat
            .replace('_', ' ')
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase()),
          value: cat
        }))
      },
      {
        type: 'list',
        name: 'priority',
        message: 'Task priority:',
        choices: [
          { name: '🔥 Critical', value: Priority.CRITICAL },
          { name: '🔴 High', value: Priority.HIGH },
          { name: '🟡 Medium', value: Priority.MEDIUM },
          { name: '🟢 Low', value: Priority.LOW }
        ]
      }
    ]);

    return answers as TaskEssentials;
  }

  /**
   * Analyze task and provide smart suggestions
   */
  private async analyzeAndSuggest(): Promise<any> {
    console.log(chalk.yellow('\n🧠 Smart Analysis'));
    console.log(chalk.gray('Analyzing your task and gathering suggestions...\n'));

    // Analyze affected files (simplified for now)
    const affectedFiles: any[] = [];

    // Show suggestions
    if (affectedFiles.length > 0) {
      console.log(chalk.green('📁 Suggested affected files:'));
      affectedFiles.slice(0, 5).forEach(file => {
        console.log(
          chalk.gray(`  • ${file.path} (${Math.round(file.confidence * 100)}% confidence)`)
        );
      });
      console.log();
    }

    return {
      affectedFiles: []
    };
  }

  /**
   * Gather additional task details
   */
  private async gatherDetails(): Promise<TaskDetails> {
    console.log(chalk.yellow('🔍 Additional Details'));
    console.log(chalk.gray("Let's add some optional details to make your task more complete:\n"));

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'affectedFiles',
        message: 'Select affected files:',
        choices: [],
        default: []
      }
    ]);

    return answers as TaskDetails;
  }

  /**
   * Build the final task schema
   */
  private buildTaskSchema(essentials: TaskEssentials, details: TaskDetails): TaskSchema {
    return {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: essentials.title,
      description: essentials.description,
      category: essentials.category,
      priority: essentials.priority,
      affectedFiles: details.affectedFiles || [],

      createdAt: new Date()
    };
  }

  /**
   * Review task before creation
   */
  private async reviewTask(taskSchema: TaskSchema): Promise<boolean> {
    console.clear();
    console.log(chalk.bold.cyan('\n📋 Task Review\n'));
    console.log(chalk.gray('Please review your task before creating it:\n'));

    // Display task details
    this.displayTaskPreview(taskSchema);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Create this task?',
        default: true
      }
    ]);

    return confirm;
  }

  /**
   * Display a preview of the task
   */
  private displayTaskPreview(task: TaskSchema): void {
    console.log(chalk.bold('Title:    ') + task.title);
    console.log(chalk.bold('Category: ') + task.category);
    console.log(chalk.bold('Priority: ') + this.getPriorityDisplay(task.priority));

    if (task.description) {
      console.log(chalk.bold('Description:'));
      console.log(chalk.gray('  ' + task.description.replace(/\n/g, '\n  ')));
    }

    if (task.affectedFiles && task.affectedFiles.length > 0) {
      console.log(
        chalk.gray('  Files:    ') +
          task.affectedFiles.slice(0, 3).join(', ') +
          (task.affectedFiles.length > 3 ? ` (+${task.affectedFiles.length - 3} more)` : '')
      );
    }

    console.log();
  }

  /**
   * Show task summary after creation
   */
  private showTaskSummary(task: Task): void {
    console.log(chalk.bold('\n📋 Task Summary:'));
    console.log(chalk.gray('  ID:       ') + task.schema.id);
    console.log(chalk.gray('  Title:    ') + task.schema.title);
    console.log(chalk.gray('  Status:   ') + task.status);
    console.log(chalk.gray('  Priority: ') + this.getPriorityDisplay(task.schema.priority));
    console.log(chalk.gray('  Category: ') + task.schema.category);

    if (task.schema.affectedFiles && task.schema.affectedFiles.length > 0) {
      console.log(chalk.gray('  Files:    ') + task.schema.affectedFiles.length + ' file(s)');
    }

    console.log();
  }

  /**
   * Get priority display string
   */
  private getPriorityDisplay(priority?: Priority): string {
    switch (priority) {
      case Priority.CRITICAL:
        return '🔥 Critical';
      case Priority.HIGH:
        return '🔴 High';
      case Priority.MEDIUM:
        return '🟡 Medium';
      case Priority.LOW:
        return '🟢 Low';
      default:
        return '🟡 Medium';
    }
  }
}
