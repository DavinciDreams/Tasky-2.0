import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - use runtime types only
import Database from 'better-sqlite3';
import path from 'path';

type Reminder = {
  id: string;
  message: string;
  time: string;
  days: string[];
  enabled: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export class ReminderBridge {
  private dbPath: string;
  private db: Database.Database;

  constructor(_configPath?: string) {
    const envDb = process.env.TASKY_DB_PATH;
    this.dbPath = envDb && envDb.trim().length > 0
      ? (path.isAbsolute(envDb) ? envDb : path.join(process.cwd(), envDb))
      : path.join(process.cwd(), 'data', 'tasky.db');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        time TEXT NOT NULL,
        days TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  private genId(): string {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return `rem_${ts}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async createReminder(args: any): Promise<CallToolResult> {
    const { message, time, days, enabled } = args;
    if (!message || !time || !Array.isArray(days) || days.length === 0) {
      return { content: [{ type: 'text', text: 'Invalid reminder: require message, time, days[]' }], isError: true };
    }
    const nowIso = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO reminders (id,message,time,days,enabled,created_at,updated_at)
      VALUES (@id,@message,@time,@days,@enabled,@created_at,@updated_at)
    `).run({
      id: this.genId(),
      message: String(message),
      time: String(time),
      days: JSON.stringify(days.map((d: any) => String(d))),
      enabled: enabled !== false ? 1 : 0,
      created_at: nowIso,
      updated_at: nowIso
    });
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
  }

  async updateReminder(args: any): Promise<CallToolResult> {
    const { id, updates } = args;
    const current: any = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    if (!current) return { content: [{ type: 'text', text: 'Reminder not found' }], isError: true };
    const next: any = {
      message: updates?.message ?? current.message,
      time: updates?.time ?? current.time,
      days: JSON.stringify((updates?.days ?? JSON.parse(current.days || '[]')).map((d: any) => String(d))),
      enabled: typeof updates?.enabled === 'boolean' ? (updates.enabled ? 1 : 0) : current.enabled,
      updated_at: new Date().toISOString()
    };
    this.db.prepare(`UPDATE reminders SET message=@message,time=@time,days=@days,enabled=@enabled,updated_at=@updated_at WHERE id=@id`).run({ id, ...next });
    const after: any = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    const rem: Reminder = { id, message: after.message, time: after.time, days: JSON.parse(after.days || '[]'), enabled: !!after.enabled };
    return { content: [{ type: 'text', text: JSON.stringify(rem) }] };
  }

  async deleteReminder(args: any): Promise<CallToolResult> {
    const { id } = args;
    const info = this.db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
    if (!info.changes) return { content: [{ type: 'text', text: 'Reminder not found' }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
  }

  async getReminder(args: any): Promise<CallToolResult> {
    const { id } = args;
    const r: any = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    if (!r) return { content: [{ type: 'text', text: 'Reminder not found' }], isError: true };
    const rem: Reminder = { id: r.id, message: r.message, time: r.time, days: r.days ? JSON.parse(r.days) : [], enabled: !!r.enabled };
    const summary = `Reminder ${rem.id}: ${rem.message}`;
    return { content: [ { type: 'text', text: summary }, { type: 'text', text: JSON.stringify(rem) } ] as any };
  }

  async listReminders(args: any): Promise<CallToolResult> {
    let items: any[] = this.db.prepare('SELECT * FROM reminders').all();
    let reminders: Reminder[] = items.map((r) => ({ id: r.id, message: r.message, time: r.time, days: r.days ? JSON.parse(r.days) : [], enabled: !!r.enabled }));
    if (typeof args?.enabled === 'boolean') reminders = reminders.filter(r => !!r.enabled === args.enabled);
    if (args?.day) reminders = reminders.filter(r => r.days?.includes(String(args.day)));
    if (args?.search) {
      const s = String(args.search).toLowerCase();
      reminders = reminders.filter(r => r.message.toLowerCase().includes(s));
    }
    return { content: [ { type: 'text', text: `Returned ${reminders.length} reminders` }, { type: 'text', text: JSON.stringify(reminders) } ] as any };
  }

  async toggleReminder(args: any): Promise<CallToolResult> {
    const { id, enabled } = args;
    const r: any = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    if (!r) return { content: [{ type: 'text', text: 'Reminder not found' }], isError: true };
    this.db.prepare('UPDATE reminders SET enabled = @enabled, updated_at = @updated_at WHERE id = @id').run({ id, enabled: enabled ? 1 : 0, updated_at: new Date().toISOString() });
    const after: any = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    const rem: Reminder = { id: after.id, message: after.message, time: after.time, days: after.days ? JSON.parse(after.days) : [], enabled: !!after.enabled };
    return { content: [{ type: 'text', text: JSON.stringify(rem) }] };
  }
}


