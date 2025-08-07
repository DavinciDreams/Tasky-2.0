import inquirer from 'inquirer';
import * as fs from 'fs-extra';
import * as path from 'path';

import chalk from 'chalk';
import { Task, TaskStatus, Priority, IssueCategory } from '../core/types';
import { TaskStore, TaskQuery } from '../tasks/task-store';

import { BeautifulTUI } from './beautiful-tui';
import Table from 'cli-table3';
import { format } from 'date-fns';
import { showCustomMenu, CustomMenuSection } from './custom-menu';

export class TaskManagerUI {
  private taskStore = TaskStore.getInstance();

  /**
   * Show the main task manager menu using custom menu system
   */
  async showMenu(): Promise<void> {
    while (true) {
      const tasks = await this.taskStore.getAll();
      const stats = await this.taskStore.getStatistics();

      // Prepare context info including file watching status
      const watchingStatus = this.taskStore.isWatchingFile() ? '🔄 Live Sync' : '⚠️ Manual Sync';
      const subtitle = `${tasks.length} tasks • ${stats.byStatus.PENDING || 0} pending • ${watchingStatus}`;

      const sections: CustomMenuSection[] = [
        {
          title: 'Task Management',
          items: [
            { name: 'Create New Task', value: 'create', icon: '➕', description: 'Add a new task' },
            {
              name: 'List & Filter Tasks',
              value: 'list',
              icon: '📋',
              description: 'View and filter tasks'
            },
            { name: 'Edit Task', value: 'edit', icon: '✏️', description: 'Modify existing task' },
            { name: 'Delete Task', value: 'delete', icon: '🗑️', description: 'Remove a task' }
          ]
        },
        {
          title: 'File Operations',
          items: [
            {
              name: 'Refresh from File',
              value: 'refresh',
              icon: '🔄',
              description: 'Sync with external changes'
            },
            {
              name: 'Export Tasks',
              value: 'export',
              icon: '📤',
              description: 'Export to JSON file'
            },
            {
              name: 'Import Tasks',
              value: 'import',
              icon: '📥',
              description: 'Import from JSON file'
            }
          ]
        },
        {
          items: [
            { name: 'Back to Main Menu', value: 'back', icon: '🔙', description: 'Return to main' }
          ]
        }
      ];

      const result = await showCustomMenu(sections, 'Task Manager', subtitle);

      switch (result) {
        case 'create':
          await this.createTask();
          break;
        case 'list':
          await this.listTasks();
          break;
        case 'edit':
          await this.editTask();
          break;
        case 'delete':
          await this.deleteTask();
          break;
        case 'refresh':
          await this.refreshTasks();
          break;
        case 'export':
          await this.exportTasks();
          break;
        case 'import':
          await this.importTasks();
          break;
        case 'back':
          return;
      }
    }
  }

  /**
   * Create a new task using custom menu system
   */
  private async createTask(): Promise<void> {
    // Step 1: Get task title
    const title = await this.getTaskTitle();
    if (!title) return;

    // Step 2: Get task description
    const description = await this.getTaskDescription();

    // Step 3: Get priority
    const priority = await this.getTaskPriority();
    if (!priority) return;

    // Step 4: Get category
    const category = await this.getTaskCategory();
    if (!category) return;

    // Create the task
    const result = await this.taskStore.create({
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description || '',
      priority,
      category,
      createdAt: new Date()
    });

    if (result.isSuccess()) {
      // Show success and next action menu
      const nextAction = await this.showTaskCreatedMenu();

      switch (nextAction) {
        case 'create':
          await this.createTask();
          break;
        case 'list':
          await this.listTasks();
          break;
        case 'back':
          break;
      }
    } else {
      BeautifulTUI.showError(result.getError());
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Get task title using a simple input
   */
  private async getTaskTitle(): Promise<string | null> {
    console.clear();
    const width = process.stdout.columns || 80;

    // Centered header
    console.log('\n');
    const title = 'Create New Task';
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(' '.repeat(Math.max(0, titlePadding)) + chalk.bold.hex('#667eea')(title));

    // Separator
    const separatorWidth = 50;
    const separatorPadding = Math.floor((width - separatorWidth) / 2);
    console.log(
      ' '.repeat(Math.max(0, separatorPadding)) + chalk.hex('#30363d')('═'.repeat(separatorWidth))
    );

    console.log('\n');

    // Centered prompt
    const promptText = 'What needs to be done?';
    const promptPadding = Math.floor((width - promptText.length) / 2);
    console.log(' '.repeat(Math.max(0, promptPadding)) + chalk.hex('#6b7280')(promptText));
    console.log('\n');

    const { title: taskTitle } = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Title:',
        prefix: ' '.repeat(Math.floor(width / 2) - 15),
        validate: (input: string) => input.trim().length > 0 || 'Title is required'
      }
    ]);

    return taskTitle || null;
  }

  /**
   * Get task description using a simple input
   */
  private async getTaskDescription(): Promise<string> {
    console.clear();
    const width = process.stdout.columns || 80;

    // Centered header
    console.log('\n');
    const title = 'Add Description';
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(' '.repeat(Math.max(0, titlePadding)) + chalk.bold.hex('#667eea')(title));

    // Separator
    const separatorWidth = 50;
    const separatorPadding = Math.floor((width - separatorWidth) / 2);
    console.log(
      ' '.repeat(Math.max(0, separatorPadding)) + chalk.hex('#30363d')('═'.repeat(separatorWidth))
    );

    console.log('\n');

    // Centered prompt
    const promptText = 'Add Task Description (press Enter to skip)';
    const promptPadding = Math.floor((width - promptText.length) / 2);
    console.log(' '.repeat(Math.max(0, promptPadding)) + chalk.hex('#6b7280')(promptText));
    console.log('\n');

    const { description } = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        prefix: ' '.repeat(Math.floor(width / 2) - 20),
        default: ''
      }
    ]);

    return description || '';
  }

  /**
   * Get task priority using custom menu
   */
  private async getTaskPriority(): Promise<Priority | null> {
    const sections: CustomMenuSection[] = [
      {
        title: 'Select Priority Level',
        items: [
          {
            name: 'Critical',
            value: Priority.CRITICAL.toString(),
            icon: '🔥',
            description: 'Drop everything!'
          },
          {
            name: 'High',
            value: Priority.HIGH.toString(),
            icon: '🔴',
            description: 'Important task'
          },
          {
            name: 'Medium',
            value: Priority.MEDIUM.toString(),
            icon: '🟡',
            description: 'Normal priority'
          },
          {
            name: 'Low',
            value: Priority.LOW.toString(),
            icon: '🟢',
            description: 'When you get time'
          }
        ]
      },
      {
        items: [
          { name: 'Cancel', value: 'cancel', icon: '❌', description: 'Cancel task creation' }
        ]
      }
    ];

    const result = await showCustomMenu(sections, 'Task Priority', '');

    if (result === 'cancel') return null;
    return parseInt(result) as Priority;
  }

  /**
   * Get task category using custom menu
   */
  private async getTaskCategory(): Promise<IssueCategory | null> {
    const sections: CustomMenuSection[] = [
      {
        title: 'Select Category',
        items: [
          {
            name: 'Frontend',
            value: IssueCategory.FRONTEND,
            icon: '🎨',
            description: 'UI/UX components'
          },
          {
            name: 'Backend',
            value: IssueCategory.BACKEND,
            icon: '⚙️',
            description: 'Server-side logic'
          },
          {
            name: 'Database',
            value: IssueCategory.DATABASE,
            icon: '🗄️',
            description: 'Data & queries'
          },
          { name: 'API', value: IssueCategory.API, icon: '🔌', description: 'Endpoints & routes' },
          {
            name: 'Config',
            value: IssueCategory.CONFIG,
            icon: '⚙️',
            description: 'Settings & setup'
          }
        ]
      },
      {
        items: [
          { name: 'Cancel', value: 'cancel', icon: '❌', description: 'Cancel task creation' }
        ]
      }
    ];

    const result = await showCustomMenu(sections, 'Task Category', '');

    if (result === 'cancel') return null;
    return result as IssueCategory;
  }

  /**
   * Show task created success menu
   */
  private async showTaskCreatedMenu(): Promise<string> {
    // Show success message first
    console.clear();
    const width = process.stdout.columns || 80;

    console.log('\n');
    const successText = '✅ Task Created Successfully!';
    const successPadding = Math.floor((width - successText.length) / 2);
    console.log(' '.repeat(Math.max(0, successPadding)) + chalk.bold.green(successText));
    console.log('\n');

    const sections: CustomMenuSection[] = [
      {
        title: 'What would you like to do next?',
        items: [
          {
            name: 'Create Another Task',
            value: 'create',
            icon: '➕',
            description: 'Add another task'
          },
          { name: 'View All Tasks', value: 'list', icon: '📋', description: 'See task list' },
          {
            name: 'Back to Task Manager',
            value: 'back',
            icon: '🔙',
            description: 'Return to main menu'
          }
        ]
      }
    ];

    return await showCustomMenu(sections, 'Task Created', '');
  }

  /**
   * List tasks with filters using custom menu system
   */
  private async listTasks(): Promise<void> {
    const sections: CustomMenuSection[] = [
      {
        title: 'Filter Options',
        items: [
          { name: 'All Tasks', value: 'all', icon: '📋', description: 'Show all tasks' },
          {
            name: 'Filter by Status',
            value: 'status',
            icon: '🔍',
            description: 'Filter by task status'
          },
          {
            name: 'Filter by Priority',
            value: 'priority',
            icon: '🎯',
            description: 'Filter by priority level'
          }
        ]
      },
      {
        items: [
          { name: 'Back to Task Manager', value: 'back', icon: '🔙', description: 'Return to main' }
        ]
      }
    ];

    const result = await showCustomMenu(sections, 'List Tasks', 'Choose how to view your tasks');

    if (result === 'back') return;

    const query: TaskQuery = {};

    // Apply filters based on selection
    if (result === 'status') {
      const statusSections: CustomMenuSection[] = [
        {
          title: 'Select Status',
          items: Object.values(TaskStatus).map(s => ({
            name: this.getStatusDisplayClean(s),
            value: s,
            icon: this.getStatusDisplay(s).split(' ')[0],
            description: ''
          }))
        }
      ];

      const statusResult = await showCustomMenu(statusSections, 'Filter by Status', '');
      query.status = [statusResult as TaskStatus];
    } else if (result === 'priority') {
      const prioritySections: CustomMenuSection[] = [
        {
          title: 'Select Priority',
          items: [
            {
              name: 'Critical',
              value: Priority.CRITICAL.toString(),
              icon: '🔥',
              description: 'Urgent & important'
            },
            { name: 'High', value: Priority.HIGH.toString(), icon: '🔴', description: 'Important' },
            {
              name: 'Medium',
              value: Priority.MEDIUM.toString(),
              icon: '🟡',
              description: 'Normal priority'
            },
            { name: 'Low', value: Priority.LOW.toString(), icon: '🟢', description: 'Can wait' }
          ]
        }
      ];

      const priorityResult = await showCustomMenu(prioritySections, 'Filter by Priority', '');
      query.priority = [parseInt(priorityResult)];
    }

    // Get and display tasks
    const tasks = await this.taskStore.query(query);

    // Display results with clean styling
    console.clear();
    const width = process.stdout.columns || 80;
    console.log('\n');

    const resultsTitle =
      result === 'all'
        ? 'All Tasks'
        : result === 'status'
          ? `Tasks - ${Array.isArray(query.status) ? query.status[0] : 'All'}`
          : result === 'priority'
            ? `Tasks - Priority ${Array.isArray(query.priority) ? query.priority[0] : 'All'}`
            : 'Tasks';
    const resultsTitlePadding = Math.floor((width - resultsTitle.length) / 2);
    console.log(
      ' '.repeat(Math.max(0, resultsTitlePadding)) + chalk.bold.hex('#667eea')(resultsTitle)
    );

    const separatorWidth = 50;
    const separatorPadding = Math.floor((width - separatorWidth) / 2);
    console.log(
      ' '.repeat(Math.max(0, separatorPadding)) + chalk.hex('#30363d')('═'.repeat(separatorWidth))
    );
    console.log();

    if (tasks.length === 0) {
      const noTasksText = 'No tasks found matching your criteria';
      const noTasksPadding = Math.floor((width - noTasksText.length) / 2);
      console.log(' '.repeat(Math.max(0, noTasksPadding)) + chalk.hex('#6b7280')(noTasksText));
    } else {
      this.displayTaskTable(tasks);
    }

    // Wait for user to continue
    console.log('\n');
    const continueText = 'Press any key to continue...';
    const continuePadding = Math.floor((width - continueText.length) / 2);
    console.log(' '.repeat(Math.max(0, continuePadding)) + chalk.hex('#6b7280')(continueText));

    await new Promise(resolve => {
      process.stdin.once('keypress', () => resolve(undefined));
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
      }
    });

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
  }

  /**
   * Display tasks in a table
   */
  private displayTaskTable(tasks: Task[]): void {
    const termWidth = process.stdout.columns || 80;

    // Calculate dynamic column widths based on terminal size
    // Leave some padding for borders and spacing
    const availableWidth = termWidth - 10; // Account for table borders and padding
    const minColWidths = [8, 20, 12, 10, 12, 12]; // Minimum widths
    const totalMinWidth = minColWidths.reduce((sum, w) => sum + w, 0);

    let colWidths: number[];
    if (availableWidth > totalMinWidth) {
      // Distribute extra space proportionally, giving more to title column
      const extraSpace = availableWidth - totalMinWidth;
      colWidths = [
        minColWidths[0] + Math.floor(extraSpace * 0.1), // ID
        minColWidths[1] + Math.floor(extraSpace * 0.6), // Title (gets most extra space)
        minColWidths[2] + Math.floor(extraSpace * 0.1), // Status
        minColWidths[3] + Math.floor(extraSpace * 0.05), // Priority
        minColWidths[4] + Math.floor(extraSpace * 0.1), // Category
        minColWidths[5] + Math.floor(extraSpace * 0.05) // Created
      ];
    } else {
      colWidths = minColWidths;
    }

    const table = new Table({
      head: ['ID', 'Title', 'Status', 'Priority', 'Category', 'Created'],
      style: {
        head: ['cyan'],
        border: ['gray']
      },
      colWidths: colWidths
    });

    tasks.forEach(task => {
      // Get clean text for status and priority (without icons for width calculation)
      const statusText = this.getStatusDisplayClean(task.status);
      const priorityText = this.getPriorityDisplayClean(task.schema.priority || Priority.MEDIUM);

      // Truncate title to fit column width (account for ellipsis)
      const maxTitleLength = colWidths[1] - 4; // Leave room for padding and ellipsis
      const truncatedTitle =
        task.schema.title.length > maxTitleLength
          ? task.schema.title.substring(0, maxTitleLength - 3) + '...'
          : task.schema.title;

      table.push([
        task.schema.id.slice(-8),
        truncatedTitle,
        statusText,
        priorityText,
        task.schema.category || 'General',
        format(task.schema.createdAt, 'MM/dd/yy')
      ]);
    });

    // Get table string and properly center it
    const tableString = table.toString();
    const lines = tableString.split('\n');

    // Better ANSI code stripping - handles all escape sequences
    const stripAnsi = (str: string): string => {
      return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    };

    // Add spacing before the table
    console.log();

    // Center each line of the table
    lines.forEach(line => {
      if (line.trim()) {
        // Only process non-empty lines
        const cleanLine = stripAnsi(line);
        const padding = Math.max(0, Math.floor((termWidth - cleanLine.length) / 2));
        console.log(' '.repeat(padding) + line);
      }
    });

    // Add spacing after the table
    console.log();
  }

  /**
   * Get status display with icon
   */
  private getStatusDisplay(status: TaskStatus): string {
    const displays = {
      [TaskStatus.PENDING]: '⏳ Pending',
      [TaskStatus.COMPLETED]: '✅ Completed',
      [TaskStatus.NEEDS_REVIEW]: '🚨 Review'
    };
    return displays[status] || status;
  }

  /**
   * Get status display without icon (for better table formatting)
   */
  private getStatusDisplayClean(status: TaskStatus): string {
    const displays = {
      [TaskStatus.PENDING]: 'Pending',
      [TaskStatus.COMPLETED]: 'Completed',
      [TaskStatus.NEEDS_REVIEW]: 'Review'
    };
    return displays[status] || status;
  }

  /**
   * Get priority display without icon (for better table formatting)
   */
  private getPriorityDisplayClean(priority: Priority): string {
    const displays = {
      [Priority.CRITICAL]: 'Critical',
      [Priority.HIGH]: 'High',
      [Priority.MEDIUM]: 'Medium',
      [Priority.LOW]: 'Low'
    };
    return displays[priority] || priority.toString();
  }

  // Full implementation methods for task management
  private async editTask(): Promise<void> {
    const tasks = await this.taskStore.getAll();

    if (tasks.length === 0) {
      BeautifulTUI.showInfo('No tasks available to edit.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }

    const sections: CustomMenuSection[] = [
      {
        title: 'Select Task to Edit',
        items: tasks.map(task => ({
          name: task.schema.title,
          value: task.schema.id,
          icon: this.getStatusDisplay(task.status).split(' ')[0],
          description: `${this.getPriorityDisplayClean(task.schema.priority || Priority.MEDIUM)} • ${task.schema.category || 'General'}`
        }))
      },
      {
        items: [
          {
            name: 'Back to Task Manager',
            value: 'cancel',
            icon: '🔙',
            description: 'Return to main menu'
          }
        ]
      }
    ];

    const result = await showCustomMenu(sections, 'Edit Task', 'Select a task to modify');

    if (result === 'cancel') return;

    const taskToEdit = tasks.find(t => t.schema.id === result);
    if (!taskToEdit) return;

    // Show edit menu
    await this.showEditTaskMenu(taskToEdit);
  }

  private async showEditTaskMenu(task: Task): Promise<void> {
    while (true) {
      // Prepare task info for subtitle
      const taskInfo = `${task.schema.title} • ${this.getStatusDisplayClean(task.status)} • ${this.getPriorityDisplayClean(task.schema.priority || Priority.MEDIUM)}`;

      const sections: CustomMenuSection[] = [
        {
          title: 'What would you like to edit?',
          items: [
            { name: 'Title', value: 'title', icon: '📝', description: 'Change task title' },
            {
              name: 'Description',
              value: 'description',
              icon: '📄',
              description: 'Edit description'
            },
            { name: 'Status', value: 'status', icon: '📊', description: 'Update task status' },
            {
              name: 'Priority',
              value: 'priority',
              icon: '🎯',
              description: 'Change priority level'
            },
            { name: 'Category', value: 'category', icon: '📂', description: 'Change category' }
          ]
        },
        {
          items: [
            { name: 'Done Editing', value: 'done', icon: '✅', description: 'Save and return' }
          ]
        }
      ];

      const result = await showCustomMenu(sections, 'Edit Task', taskInfo);

      if (result === 'done') break;

      await this.editTaskField(task, result);
    }
  }

  private async editTaskField(task: Task, field: string): Promise<void> {
    const updates: any = {};

    switch (field) {
      case 'title':
        const { title } = await inquirer.prompt([
          {
            type: 'input',
            name: 'title',
            message: 'New title:',
            default: task.schema.title,
            validate: (input: string) => input.trim().length > 0 || 'Title cannot be empty'
          }
        ]);
        updates.title = title;
        break;

      case 'description':
        const { description } = await inquirer.prompt([
          {
            type: 'editor',
            name: 'description',
            message: 'Edit description:',
            default: task.schema.description
          }
        ]);
        updates.description = description;
        break;

      case 'status':
        const statusSections: CustomMenuSection[] = [
          {
            items: Object.values(TaskStatus).map(status => ({
              name: this.getStatusDisplayClean(status),
              value: status,
              icon: this.getStatusDisplay(status).split(' ')[0],
              description: ''
            }))
          }
        ];

        const statusResult = await showCustomMenu(statusSections, 'Select New Status', '');
        updates.status = statusResult as TaskStatus;
        break;

      case 'priority':
        const prioritySections: CustomMenuSection[] = [
          {
            items: [
              {
                name: 'Critical',
                value: Priority.CRITICAL.toString(),
                icon: '🔥',
                description: 'Urgent & important'
              },
              {
                name: 'High',
                value: Priority.HIGH.toString(),
                icon: '🔴',
                description: 'Important'
              },
              {
                name: 'Medium',
                value: Priority.MEDIUM.toString(),
                icon: '🟡',
                description: 'Normal priority'
              },
              { name: 'Low', value: Priority.LOW.toString(), icon: '🟢', description: 'Can wait' }
            ]
          }
        ];

        const priorityResult = await showCustomMenu(prioritySections, 'Select New Priority', '');
        updates.priority = parseInt(priorityResult);
        break;

      case 'category':
        const categorySections: CustomMenuSection[] = [
          {
            items: Object.values(IssueCategory).map(category => ({
              name: category.replace('_', ' '),
              value: category,
              icon: '📂',
              description: ''
            }))
          }
        ];

        const categoryResult = await showCustomMenu(categorySections, 'Select New Category', '');
        updates.category = categoryResult as IssueCategory;
        break;
    }

    // Update the task
    const result = await this.taskStore.update(task.schema.id, updates);
    if (result.isSuccess()) {
      // Update the local task object
      Object.assign(task, result.getValue());
      BeautifulTUI.showSuccess('Task updated successfully!');
    } else {
      BeautifulTUI.showError(result.getError());
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  private async deleteTask(): Promise<void> {
    const tasks = await this.taskStore.getAll();

    if (tasks.length === 0) {
      BeautifulTUI.showInfo('No tasks available to delete.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }

    const sections: CustomMenuSection[] = [
      {
        title: 'Select Task to Delete',
        items: tasks.map(task => ({
          name: task.schema.title,
          value: task.schema.id,
          icon: '🗑️',
          description: `${this.getPriorityDisplayClean(task.schema.priority || Priority.MEDIUM)} • ${task.schema.category || 'General'}`
        }))
      },
      {
        items: [
          {
            name: 'Back to Task Manager',
            value: 'cancel',
            icon: '🔙',
            description: 'Return to main menu'
          }
        ]
      }
    ];

    const result = await showCustomMenu(
      sections,
      'Delete Task',
      'Select a task to remove permanently'
    );

    if (result === 'cancel') return;

    const taskToDelete = tasks.find(t => t.schema.id === result);
    if (!taskToDelete) return;

    // Confirm deletion using custom menu
    const confirmSections: CustomMenuSection[] = [
      {
        title: `Delete "${taskToDelete.schema.title}"?`,
        items: [
          {
            name: 'Yes, Delete Task',
            value: 'confirm',
            icon: '🗑️',
            description: 'Permanently remove this task'
          },
          { name: 'No, Keep Task', value: 'cancel', icon: '❌', description: 'Cancel deletion' }
        ]
      }
    ];

    const confirmation = await showCustomMenu(
      confirmSections,
      'Confirm Deletion',
      'This action cannot be undone'
    );

    if (confirmation === 'confirm') {
      const deleteResult = await this.taskStore.delete(taskToDelete.schema.id);
      if (deleteResult.isSuccess()) {
        BeautifulTUI.showSuccess('Task deleted successfully!');
      } else {
        BeautifulTUI.showError(deleteResult.getError());
      }
    } else {
      BeautifulTUI.showInfo('Deletion cancelled.');
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  private async exportTasks(): Promise<void> {
    const sections: CustomMenuSection[] = [
      {
        title: 'Export Options',
        items: [
          {
            name: 'Export All Tasks',
            value: 'all',
            icon: '📦',
            description: 'Export all tasks to JSON'
          },
          {
            name: 'Export to Project Tasks Folder',
            value: 'project',
            icon: '📁',
            description: 'Save to tasks/tasks.json'
          },
          {
            name: 'Custom Export',
            value: 'custom',
            icon: '⚙️',
            description: 'Choose specific tasks'
          }
        ]
      },
      {
        items: [
          {
            name: 'Back to Task Manager',
            value: 'cancel',
            icon: '🔙',
            description: 'Return to main menu'
          }
        ]
      }
    ];

    const result = await showCustomMenu(sections, 'Export Tasks', 'Save your tasks to a file');

    if (result === 'cancel') return;

    try {
      let exportResult;

      switch (result) {
        case 'all':
          exportResult = await this.taskStore.export();
          if (exportResult.isSuccess()) {
            const { filename } = await inquirer.prompt([
              {
                type: 'input',
                name: 'filename',
                message: 'Export filename:',
                default: `tasks-export-${new Date().toISOString().split('T')[0]}.json`
              }
            ]);

            await fs.writeFile(filename, exportResult.getValue());
            BeautifulTUI.showSuccess(`Tasks exported to ${filename}`);
          }
          break;

        case 'project':
          exportResult = await this.taskStore.export();
          if (exportResult.isSuccess()) {
            const projectTasksPath = path.join(process.cwd(), 'tasks', 'tasks.json');
            await fs.ensureDir(path.dirname(projectTasksPath));
            await fs.writeFile(projectTasksPath, exportResult.getValue());
            BeautifulTUI.showSuccess(`Tasks exported to ${projectTasksPath}`);
          }
          break;

        case 'custom':
          await this.customExportTasks();
          return;
      }

      if (exportResult && exportResult.isFailure()) {
        BeautifulTUI.showError(exportResult.getError());
      }
    } catch (error) {
      BeautifulTUI.showError(`Export failed: ${error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async customExportTasks(): Promise<void> {
    const tasks = await this.taskStore.getAll();

    if (tasks.length === 0) {
      BeautifulTUI.showInfo('No tasks available to export.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }

    const { selectedTasks } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedTasks',
        message: 'Select tasks to export:',
        choices: tasks.map(task => ({
          name: `${task.schema.title} (${this.getStatusDisplayClean(task.status)})`,
          value: task.schema.id,
          checked: false
        }))
      }
    ]);

    if (selectedTasks.length === 0) {
      BeautifulTUI.showInfo('No tasks selected.');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return;
    }

    const exportResult = await this.taskStore.export(selectedTasks);
    if (exportResult.isSuccess()) {
      const { filename } = await inquirer.prompt([
        {
          type: 'input',
          name: 'filename',
          message: 'Export filename:',
          default: `selected-tasks-${new Date().toISOString().split('T')[0]}.json`
        }
      ]);

      await fs.writeFile(filename, exportResult.getValue());
      BeautifulTUI.showSuccess(`${selectedTasks.length} tasks exported to ${filename}`);
    } else {
      BeautifulTUI.showError(exportResult.getError());
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async importTasks(): Promise<void> {
    const sections: CustomMenuSection[] = [
      {
        title: 'Import Options',
        items: [
          {
            name: 'Import from File',
            value: 'file',
            icon: '📄',
            description: 'Import from JSON file'
          },
          {
            name: 'Import from Project Tasks',
            value: 'project',
            icon: '📁',
            description: 'Import from tasks/tasks.json'
          }
        ]
      },
      {
        items: [
          {
            name: 'Back to Task Manager',
            value: 'cancel',
            icon: '🔙',
            description: 'Return to main menu'
          }
        ]
      }
    ];

    const result = await showCustomMenu(sections, 'Import Tasks', 'Load tasks from a file');

    if (result === 'cancel') return;

    try {
      let jsonData: string;

      switch (result) {
        case 'file':
          const { filename } = await inquirer.prompt([
            {
              type: 'input',
              name: 'filename',
              message: 'Import filename:',
              validate: (input: string) => {
                if (!input.trim()) return 'Filename is required';
                if (!fs.existsSync(input)) return 'File does not exist';
                return true;
              }
            }
          ]);

          jsonData = await fs.readFile(filename, 'utf8');
          break;

        case 'project':
          const projectTasksPath = path.join(process.cwd(), 'tasks', 'tasks.json');
          if (!fs.existsSync(projectTasksPath)) {
            BeautifulTUI.showError('Project tasks file not found at tasks/tasks.json');
            await new Promise(resolve => setTimeout(resolve, 2000));
            return;
          }

          jsonData = await fs.readFile(projectTasksPath, 'utf8');
          break;

        default:
          return;
      }

      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Overwrite existing tasks with same IDs?',
          default: false
        }
      ]);

      const importResult = await this.taskStore.import(jsonData, overwrite);
      if (importResult.isSuccess()) {
        const imported = importResult.getValue();
        BeautifulTUI.showSuccess(`Successfully imported ${imported} tasks!`);
      } else {
        BeautifulTUI.showError(importResult.getError());
      }
    } catch (error) {
      BeautifulTUI.showError(`Import failed: ${error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Refresh tasks from file manually
   */
  private async refreshTasks(): Promise<void> {
    console.clear();
    const width = process.stdout.columns || 80;

    console.log('\n');
    const title = 'Refreshing Tasks';
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(' '.repeat(Math.max(0, titlePadding)) + chalk.bold.hex('#667eea')(title));

    const separatorWidth = 50;
    const separatorPadding = Math.floor((width - separatorWidth) / 2);
    console.log(
      ' '.repeat(Math.max(0, separatorPadding)) + chalk.hex('#30363d')('═'.repeat(separatorWidth))
    );

    console.log('\n');

    const spinner = BeautifulTUI.createSpinner('Syncing with tasks file...');

    try {
      const result = await this.taskStore.refresh();

      if (result.isSuccess()) {
        const changedCount = result.getValue();
        if (changedCount > 0) {
          spinner.succeed(`Tasks refreshed! ${changedCount} changes detected.`);

          // Show what changed
          const stats = await this.taskStore.getStatistics();
          console.log('\n' + chalk.cyan('Updated Status:'));
          console.log(`  📊 Total Tasks: ${chalk.bold(stats.total)}`);
          console.log(`  ⏳ Pending: ${chalk.yellow(stats.byStatus.PENDING || 0)}`);
          console.log(`  ✅ Completed: ${chalk.green(stats.byStatus.COMPLETED || 0)}`);
          console.log(
            `  🔄 File Watching: ${chalk.blue(this.taskStore.isWatchingFile() ? 'Active' : 'Inactive')}`
          );
        } else {
          spinner.succeed('Tasks are already up to date.');
          console.log('\n' + chalk.gray('No external changes detected.'));
        }
      } else {
        spinner.fail(`Refresh failed: ${result.getError()}`);
      }
    } catch (error) {
      spinner.fail(`Refresh error: ${error}`);
    }

    console.log('\n' + chalk.gray('Press any key to continue...'));

    await new Promise(resolve => {
      process.stdin.once('keypress', () => resolve(undefined));
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
      }
    });

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
  }
}
