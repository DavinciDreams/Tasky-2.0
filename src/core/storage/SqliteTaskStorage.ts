import Database from 'better-sqlite3';
import { ITaskStorage } from './ITaskStorage';
import { TaskyTask, ToolResult } from '../../types/task';

export class SqliteTaskStorage implements ITaskStorage {
  private dbPath: string;
  private db?: Database.Database;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<ToolResult<void>> {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('foreign_keys = ON');
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
      return { success: true, message: 'SQLite initialized' };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to init sqlite' };
    }
  }

  async loadAllTasks(): Promise<ToolResult<TaskyTask[]>> {
    try {
      if (!this.db) throw new Error('DB not initialized');
      const rows = this.db.prepare('SELECT * FROM tasks').all();
      const tagRows = this.db.prepare('SELECT task_id, tag FROM task_tags').all();
      const taskIdToTags: Record<string, string[]> = {};
      for (const r of tagRows) {
        (taskIdToTags[r.task_id] ||= []).push(r.tag);
      }
      const tasks: TaskyTask[] = rows.map((r: any) => ({
        schema: {
          id: r.id,
          title: r.title,
          description: r.description || undefined,
          createdAt: new Date(r.created_at),
          updatedAt: new Date(r.updated_at),
          dueDate: r.due_date ? new Date(r.due_date) : undefined,
          tags: taskIdToTags[r.id] || [],
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
      return { success: true, data: tasks };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to load tasks' };
    }
  }

  async saveTask(task: TaskyTask): Promise<ToolResult<void>> {
    try {
      if (!this.db) throw new Error('DB not initialized');
      const t = this.db.transaction(() => {
        this.db!.prepare(`
          INSERT INTO tasks (id,title,description,status,created_at,updated_at,due_date,human_approved,reminder_enabled,result,completed_at,assigned_agent,execution_path,metadata)
          VALUES (@id,@title,@description,@status,@created_at,@updated_at,@due_date,@human_approved,@reminder_enabled,@result,@completed_at,@assigned_agent,@execution_path,@metadata)
          ON CONFLICT(id) DO UPDATE SET
            title=excluded.title,
            description=excluded.description,
            status=excluded.status,
            created_at=excluded.created_at,
            updated_at=excluded.updated_at,
            due_date=excluded.due_date,
            human_approved=excluded.human_approved,
            reminder_enabled=excluded.reminder_enabled,
            result=excluded.result,
            completed_at=excluded.completed_at,
            assigned_agent=excluded.assigned_agent,
            execution_path=excluded.execution_path,
            metadata=excluded.metadata
        `).run({
          id: task.schema.id,
          title: task.schema.title,
          description: task.schema.description || null,
          status: task.status,
          created_at: task.schema.createdAt.toISOString(),
          updated_at: task.schema.updatedAt.toISOString(),
          due_date: task.schema.dueDate ? task.schema.dueDate.toISOString() : null,
          human_approved: task.humanApproved ? 1 : 0,
          reminder_enabled: task.reminderEnabled ? 1 : 0,
          result: task.result || null,
          completed_at: task.completedAt ? task.completedAt.toISOString() : null,
          assigned_agent: task.schema.assignedAgent || null,
          execution_path: task.schema.executionPath || null,
          metadata: task.metadata ? JSON.stringify(task.metadata) : null
        });
        // Replace tags
        this.db!.prepare('DELETE FROM task_tags WHERE task_id = ?').run(task.schema.id);
        const insertTag = this.db!.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?,?)');
        for (const tag of task.schema.tags || []) {
          insertTag.run(task.schema.id, tag);
        }
      });
      t();
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to save task' };
    }
  }

  async deleteTask(taskId: string): Promise<ToolResult<void>> {
    try {
      if (!this.db) throw new Error('DB not initialized');
      const t = this.db.transaction(() => {
        this.db!.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId);
        this.db!.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
      });
      t();
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to delete task' };
    }
  }
}


