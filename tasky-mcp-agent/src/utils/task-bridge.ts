import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - use runtime types only
import Database from 'better-sqlite3';
import path from 'path';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW' | 'ARCHIVED';

type TaskyTask = {
  schema: {
    id: string;
    title: string;
    description?: string;
    dueDate?: Date;
    createdAt: Date;
    updatedAt?: Date;
    tags?: string[];
    affectedFiles?: string[];
    estimatedDuration?: number;
    dependencies?: string[];
    assignedAgent?: string;
    executionPath?: string;
  };
  status: TaskStatus;
  humanApproved: boolean;
  result?: string;
  completedAt?: Date;
  reminderEnabled?: boolean;
  reminderTime?: string;
  metadata?: any;
};

export class TaskBridge {
  private dbPath: string;
  private db: Database.Database;

  constructor(_tasksPath?: string) {
    // Always use SQLite DB shared with Electron app
    const envDb = process.env.TASKY_DB_PATH;
    this.dbPath = envDb && envDb.trim().length > 0
      ? (path.isAbsolute(envDb) ? envDb : path.join(process.cwd(), envDb))
      : path.join(process.cwd(), '..', 'data', 'tasky.db'); // Point to parent directory's data folder
    this.db = new Database(this.dbPath);
    const requestedJournal = (process.env.TASKY_SQLITE_JOURNAL || 'DELETE').toUpperCase();
    const journal = requestedJournal === 'WAL' ? 'WAL' : 'DELETE';
    try { this.db.pragma(`journal_mode = ${journal}`); } catch {}
    try { this.db.pragma('synchronous = NORMAL'); } catch {}
    try { this.db.pragma('foreign_keys = ON'); } catch {}
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED','NEEDS_REVIEW','ARCHIVED')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        due_date TEXT,
        human_approved INTEGER NOT NULL DEFAULT 0,
        reminder_enabled INTEGER NOT NULL DEFAULT 0,
        result TEXT,
        completed_at TEXT,
        assigned_agent TEXT,
        execution_path TEXT,
        metadata TEXT
      );
      CREATE TABLE IF NOT EXISTS task_tags (
        task_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY(task_id, tag),
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    `);
  }

  private generateTaskId(title: string): string {
    const prefix = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .slice(0, 3)
      .join('_');
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const uuid = uuidv4().slice(0, 8);
    return `${prefix}_${timestamp}_${uuid}`;
  }

  /**
   * Log task creation (notification now handled by main app via IPC)
   */
  private async notifyTaskCreated(title: string, description?: string): Promise<void> {
    // IMPORTANT: Do not write to stdout (reserved for JSON-RPC). Use stderr for diagnostics.
    const message = `[TASK-CREATED] Task created: ${title}${description ? ` - ${description}` : ''}`;
    process.stderr.write(Buffer.from(message + '\n', 'utf8'));
  }

  async createTask(args: any): Promise<CallToolResult> {
    if (!args?.title || typeof args.title !== 'string') {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const now = new Date();
    const id = this.generateTaskId(args.title);
    const t = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO tasks (id,title,description,status,created_at,updated_at,due_date,human_approved,reminder_enabled,result,completed_at,assigned_agent,execution_path,metadata)
        VALUES (@id,@title,@description,@status,@created_at,@updated_at,@due_date,@human_approved,@reminder_enabled,@result,@completed_at,@assigned_agent,@execution_path,@metadata)
      `).run({
        id,
        title: args.title,
        description: args.description || null,
      status: 'PENDING',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        due_date: args.dueDate ? new Date(args.dueDate).toISOString() : null,
        human_approved: 0,
        reminder_enabled: args.reminderEnabled ? 1 : 0,
        result: null,
        completed_at: null,
        assigned_agent: args.assignedAgent || null,
        execution_path: args.executionPath || null,
        metadata: JSON.stringify({ version: 1, createdBy: 'tasky-mcp', lastModified: now })
      });
      // Tags
      if (Array.isArray(args.tags)) {
        const ins = this.db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?,?)');
        for (const tag of args.tags) ins.run(id, String(tag));
      }
    });
    t();
    
    // Notify the main application about the created task
    try {
      await this.notifyTaskCreated(args.title, args.description);
    } catch (error) {
      // Don't fail the task creation if notification fails
      process.stderr.write(Buffer.from(`Failed to send task creation notification: ${error}\n`, 'utf8'));
    }
    
    const created = await this.getTask({ id });
    return created;
  }

  async updateTask(args: any): Promise<CallToolResult> {
    const { id, updates } = args || {};
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const current = await this.getTask({ id });
    if ((current as any).isError) return current;
    const now = new Date();
    const prev = JSON.parse((current as any).content[1].text) as TaskyTask;
    const nextStatus: TaskStatus | undefined = updates?.status;
    const completedAt = nextStatus === 'COMPLETED' && prev.status !== 'COMPLETED' ? now : prev.completedAt;

    const schemaFields = ['title','description','dueDate','assignedAgent','executionPath'] as const;
    const topFields = ['status','reminderEnabled','result'] as const;

    const nextSchema: any = { ...prev.schema };
    for (const k of schemaFields) {
      if (k in updates) {
        nextSchema[k] = k === 'dueDate' && updates[k] ? new Date(updates[k]) : updates[k];
      }
    }
    const nextTop: any = { ...prev };
    for (const k of topFields) {
      if (k in updates) nextTop[k] = updates[k];
    }

    const t = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE tasks SET
          title=@title,
          description=@description,
          status=@status,
          updated_at=@updated_at,
          due_date=@due_date,
          human_approved=@human_approved,
          reminder_enabled=@reminder_enabled,
          result=@result,
          completed_at=@completed_at,
          assigned_agent=@assigned_agent,
          execution_path=@execution_path,
          metadata=@metadata
        WHERE id=@id
      `).run({
        id,
        title: nextSchema.title,
        description: nextSchema.description || null,
        status: nextStatus ?? prev.status,
        updated_at: now.toISOString(),
        due_date: nextSchema.dueDate ? new Date(nextSchema.dueDate).toISOString() : null,
        human_approved: prev.humanApproved ? 1 : 0,
        reminder_enabled: nextTop.reminderEnabled ? 1 : 0,
        result: nextTop.result || null,
        completed_at: completedAt ? (completedAt instanceof Date ? completedAt.toISOString() : completedAt) : null,
        assigned_agent: nextSchema.assignedAgent || null,
        execution_path: nextSchema.executionPath || null,
        metadata: JSON.stringify({ ...(prev.metadata || {}), lastModified: now })
      });
      // Tags
      if (Array.isArray(updates?.tags)) {
        this.db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id);
        const ins = this.db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?,?)');
        for (const tag of updates.tags) ins.run(id, String(tag));
      }
    });
    t();
    return this.getTask({ id });
  }

  async deleteTask(args: any): Promise<CallToolResult> {
    const { id: idArg, title } = args || {};
    let id = idArg;
    if (!id && title) {
      const row: any = this.db.prepare('SELECT id, title FROM tasks WHERE title = ? ORDER BY created_at DESC LIMIT 1').get(String(title));
      if (row) id = row.id;
    }
    if (!id) return { content: [{ type: 'text', text: 'Provide id or exact title' }], isError: true };
    
    // Get task info before deleting for the response
    const task: any = this.db.prepare('SELECT id, title, status FROM tasks WHERE id = ?').get(id);
    if (!task) return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
    
    const t = this.db.transaction(() => {
      this.db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id);
      this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    });
    t();
    
    return { 
      content: [
        { type: 'text', text: `Task "${task.title}" deleted` },
        { type: 'text', text: JSON.stringify({ success: true, id: task.id, title: task.title, status: task.status }) }
      ] 
    };
  }

  async getTask(args: any): Promise<CallToolResult> {
    const { id } = args || {};
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const row: any = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!row) return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
    const tags = this.db.prepare('SELECT tag FROM task_tags WHERE task_id = ?').all(id).map((r: any) => r.tag);
    const task: TaskyTask = {
      schema: {
        id: row.id,
        title: row.title,
        description: row.description || undefined,
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        tags,
        affectedFiles: [],
        estimatedDuration: undefined,
        dependencies: [],
        assignedAgent: row.assigned_agent || undefined,
        executionPath: row.execution_path || undefined
      },
      status: row.status,
      humanApproved: !!row.human_approved,
      result: row.result || undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      reminderEnabled: !!row.reminder_enabled,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
    const summary = `Task ${task.schema.id}: ${task.schema.title}`;
    return { content: [ { type: 'text', text: summary }, { type: 'text', text: JSON.stringify(task) } ] as any };
  }

  async listTasks(args: any): Promise<CallToolResult> {
    const rows: any[] = this.db.prepare('SELECT * FROM tasks').all();
    const tagsRows: any[] = this.db.prepare('SELECT task_id, tag FROM task_tags').all();
    const idToTags: Record<string, string[]> = {};
    for (const r of tagsRows) (idToTags[r.task_id] ||= []).push(r.tag);
    let tasks: TaskyTask[] = rows.map((r) => ({
      schema: {
        id: r.id,
        title: r.title,
        description: r.description || undefined,
        dueDate: r.due_date ? new Date(r.due_date) : undefined,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
        tags: idToTags[r.id] || [],
        affectedFiles: [],
        estimatedDuration: undefined,
        dependencies: [],
        assignedAgent: r.assigned_agent || undefined,
        executionPath: r.execution_path || undefined
      },
      status: r.status,
      humanApproved: !!r.human_approved,
      reminderEnabled: !!r.reminder_enabled,
      result: r.result || undefined,
      completedAt: r.completed_at ? new Date(r.completed_at) : undefined,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined
    }));

    if (Array.isArray(args?.status) && args.status.length) tasks = tasks.filter(t => args.status.includes(t.status));
    if (Array.isArray(args?.tags) && args.tags.length) tasks = tasks.filter(t => (t.schema.tags || []).some((tag) => args.tags.includes(tag)));
    if (args?.search) {
      const s = String(args.search).toLowerCase();
      tasks = tasks.filter(t => t.schema.title.toLowerCase().includes(s) || (t.schema.description || '').toLowerCase().includes(s));
    }
    if (args?.dueDateFrom) {
      const from = new Date(args.dueDateFrom).getTime();
      tasks = tasks.filter(t => t.schema.dueDate && t.schema.dueDate.getTime() >= from);
    }
    if (args?.dueDateTo) {
      const to = new Date(args.dueDateTo).getTime();
      tasks = tasks.filter(t => t.schema.dueDate && t.schema.dueDate.getTime() <= to);
    }
    tasks.sort((a, b) => {
      if (a.schema.dueDate && b.schema.dueDate) return a.schema.dueDate.getTime() - b.schema.dueDate.getTime();
      if (a.schema.dueDate) return -1;
      if (b.schema.dueDate) return 1;
      return b.schema.createdAt.getTime() - a.schema.createdAt.getTime();
    });
    const offset = args?.offset || 0;
    const limit = args?.limit || tasks.length;
    const page = tasks.slice(offset, offset + limit);
    return { content: [ { type: 'text', text: `Returned ${page.length} of ${tasks.length} tasks` }, { type: 'text', text: JSON.stringify(page) } ] as any };
  }

  async executeTask(args: any): Promise<CallToolResult> {
    const { id, status } = args || {};
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    
    try {
      // First, get the task to check if it exists and get execution details
      const taskResult = await this.getTask({ id });
      if (taskResult.isError) {
        return taskResult;
      }
      
      // Parse task details from the result
      const taskJsonStr = (taskResult.content as any)?.[1]?.text;
      const task = taskJsonStr ? JSON.parse(taskJsonStr) : null;
      
      if (!task) {
        return { content: [{ type: 'text', text: 'Failed to get task details for execution' }], isError: true };
      }

      // Try to delegate to main Tasky app for full execution (like clicking play button)
      try {
        const mainAppUrl = 'http://localhost:7844/execute-task';
        const provider = (task.schema.assignedAgent || '').toLowerCase() === 'claude' ? 'claude' : 'gemini';
        
        // Use node fetch for HTTP call
        const response = await fetch(mainAppUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: id,
            agent: provider
          }),
          // 5 second timeout for main app response
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const result = await response.json();
          
          // Main app execution successful - return detailed results
          return {
            content: [
              { type: 'text', text: `Task ${task.schema.title}` },
              { type: 'text', text: JSON.stringify({
                ...task,
                schema: {
                  ...task.schema,
                  status: status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
                  updatedAt: new Date().toISOString()
                }
              }) },
              { type: 'text', text: `Execution delegated to main Tasky application with ${provider} agent` }
            ]
          };
        } else {
          throw new Error(`Main app returned ${response.status}: ${response.statusText}`);
        }
        
      } catch (httpError) {
        // Main app not available - fallback to simple status update
        console.warn('Main app execution failed, falling back to status update:', httpError);
        
        const executionStatus: TaskStatus = (status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS');
        const updates: any = { status: executionStatus };
        
        const result = await this.updateTask({ id, updates });
        
        if (result.isError) {
          return result;
        }
        
        return { 
          content: [
            { type: 'text', text: `Task ${task.schema.title}` },
            { type: 'text', text: JSON.stringify({
              ...task,
              schema: {
                ...task.schema,
                status: executionStatus,
                updatedAt: new Date().toISOString()
              }
            }) },
            { type: 'text', text: `Note: Task execution requires main Tasky app to be running (Error: ${httpError instanceof Error ? httpError.message : String(httpError)})` }
          ]
        };
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { 
        content: [{ type: 'text', text: `Error executing task: ${errorMsg}` }], 
        isError: true 
      };
    }
  }
}


