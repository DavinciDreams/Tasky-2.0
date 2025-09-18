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
      : path.join(process.cwd(), '..', 'data', 'tasky.db'); // Point to parent directory's data folder
    this.db = new Database(this.dbPath);
    const requestedJournal = (process.env.TASKY_SQLITE_JOURNAL || 'DELETE').toUpperCase();
    const journal = requestedJournal === 'WAL' ? 'WAL' : 'DELETE';
    try { this.db.pragma(`journal_mode = ${journal}`); } catch {}
    try { this.db.pragma('synchronous = NORMAL'); } catch {}
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        time TEXT NOT NULL,
        days TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        one_time INTEGER NOT NULL DEFAULT 0,
        triggered_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  private genId(): string {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return `rem_${ts}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Log reminder creation (notification now handled by main app via IPC)
   */
  private async notifyReminderCreated(message: string, time: string, days: string[]): Promise<void> {
    // IMPORTANT: Do not write to stdout (reserved for JSON-RPC). Use stderr for diagnostics.
    process.stderr.write(Buffer.from(`[ReminderBridge] Reminder created: ${message} at ${time} on ${days.join(', ')}` + '\n', 'utf8'));
  }

  async createReminder(args: any): Promise<CallToolResult> {
    const { message, time, days, enabled, oneTime } = args;
    if (!message || !time) {
      return { content: [{ type: 'text', text: 'Invalid reminder: require message and time' }], isError: true };
    }
    
    // If no days provided or empty array, default to all days (daily reminder)
    let reminderDays = days;
    if (!Array.isArray(days) || days.length === 0) {
      reminderDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    }
    
    // Avoid stdout (reserved for JSON-RPC). Log to stderr instead.
    try {
      process.stderr.write(
        Buffer.from(
          '[ReminderBridge] Creating reminder: ' +
            JSON.stringify({ message, time, days: reminderDays, enabled, oneTime }) +
            '\n',
          'utf8'
        )
      );
    } catch {}
    
    const nowIso = new Date().toISOString();
    const reminderId = this.genId();
    
    // First check if the table has the one_time column
    try {
      this.db.exec(`ALTER TABLE reminders ADD COLUMN one_time INTEGER NOT NULL DEFAULT 0`);
    } catch {
      // Column already exists, ignore
    }
    try {
      this.db.exec(`ALTER TABLE reminders ADD COLUMN triggered_at TEXT`);
    } catch {
      // Column already exists, ignore
    }
    
    try {
      this.db.prepare(`
        INSERT INTO reminders (id,message,time,days,enabled,one_time,created_at,updated_at)
        VALUES (@id,@message,@time,@days,@enabled,@one_time,@created_at,@updated_at)
      `).run({
        id: reminderId,
        message: String(message),
        time: String(time),
        days: JSON.stringify(reminderDays.map((d: any) => String(d))),
        enabled: enabled !== false ? 1 : 0,
        one_time: oneTime === true ? 1 : 0,
        created_at: nowIso,
        updated_at: nowIso
      });
    } catch (error) {
      console.error('Database error creating reminder:', error);
      return { content: [{ type: 'text', text: `Database error: ${error}` }], isError: true };
    }
    
    // Notify the main application about the created reminder
    try {
      await this.notifyReminderCreated(message, time, reminderDays);
    } catch (error) {
      // Don't fail the reminder creation if notification fails
      process.stderr.write(Buffer.from(`Failed to send reminder creation notification: ${error}\n`, 'utf8'));
    }
    
    // Load the created reminder to return structured data
    const created: any = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(reminderId);
    const rem: Reminder = {
      id: created.id,
      message: created.message,
      time: created.time,
      days: created.days ? JSON.parse(created.days) : reminderDays,
      enabled: !!created.enabled,
      createdAt: created.created_at,
      updatedAt: created.updated_at
    };

    return {
      content: [
        // Put JSON first so clients that parse the first payload succeed
        { type: 'text', text: JSON.stringify(rem) },
        { type: 'text', text: `Reminder ${rem.id}: ${rem.message}` }
      ]
    };
  }

  async updateReminder(args: any): Promise<CallToolResult> {
    const { id: idArg, matchMessage, updates } = args || {};
    let current: any = null;
    if (idArg) current = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(idArg);
    if (!current && matchMessage) {
      const rows: any[] = this.db.prepare('SELECT * FROM reminders').all();
      const sanitize = (s: string) => {
        let q = String(s || '').toLowerCase().trim();
        q = q.replace(/["']/g, '');
        q = q.replace(/\s+(name|title|message)\s+to\s+.*$/, '');
        q = q.replace(/\s+to\s+.*$/, '');
        q = q.replace(/^update\s+/, '').trim();
        return q.trim();
      };
      const query = sanitize(String(matchMessage));
      let best: any = null; let bestScore = -1;
      const score = (a: string, b: string) => {
        a = a.toLowerCase(); b = b.toLowerCase();
        if (a === b) return 1;
        if (a.includes(b) || b.includes(a)) return 0.9;
        const as = new Set(a.split(/\s+/));
        const bs = new Set(b.split(/\s+/));
        const inter = [...as].filter(x => bs.has(x)).length;
        const union = new Set([...as, ...bs]).size;
        return union ? inter / union : 0;
      };
      for (const r of rows) {
        const s = score(r.message, query);
        if (s > bestScore) { best = r; bestScore = s; }
      }
      if (best && bestScore >= 0.35) current = best;
    }
    if (!current) return { content: [{ type: 'text', text: 'Provide id or matchMessage; reminder not found' }], isError: true };
    const next: any = {
      message: updates?.message ?? current.message,
      time: updates?.time ?? current.time,
      days: JSON.stringify((updates?.days ?? JSON.parse(current.days || '[]')).map((d: any) => String(d))),
      enabled: typeof updates?.enabled === 'boolean' ? (updates.enabled ? 1 : 0) : current.enabled,
      updated_at: new Date().toISOString()
    };
    this.db.prepare(`UPDATE reminders SET message=@message,time=@time,days=@days,enabled=@enabled,updated_at=@updated_at WHERE id=@id`).run({ id: current.id, ...next });
    const after: any = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(current.id);
    const rem: Reminder = { id: current.id, message: after.message, time: after.time, days: JSON.parse(after.days || '[]'), enabled: !!after.enabled };
    return { content: [{ type: 'text', text: JSON.stringify(rem) }] };
  }

  async deleteReminder(args: any): Promise<CallToolResult> {
    const { id: idArg, message } = args || {};
    let current: any = null;
    if (idArg) current = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(idArg);
    if (!current && message) {
      const rows: any[] = this.db.prepare('SELECT * FROM reminders').all();
      const sanitize = (s: string) => {
        let q = String(s || '').toLowerCase().trim();
        q = q.replace(/["']/g, '');
        q = q.replace(/\s+(name|title|message)\s+to\s+.*$/, '');
        q = q.replace(/\s+to\s+.*$/, '');
        q = q.replace(/^(delete|remove)\s+/, '').trim();
        return q.trim();
      };
      const normalize = (s: string) => sanitize(s).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const query = normalize(String(message));
      let best: any = null; let bestScore = -1;
      const score = (a: string, b: string) => {
        a = normalize(a); b = normalize(b);
        if (a === b) return 1;
        if (a.includes(b) || b.includes(a)) return 0.9;
        const as = new Set(a.split(/\s+/));
        const bs = new Set(b.split(/\s+/));
        const inter = [...as].filter(x => bs.has(x)).length;
        const union = new Set([...as, ...bs]).size;
        return union ? inter / union : 0;
      };
      for (const r of rows) {
        const s = score(r.message, query);
        if (s > bestScore) { best = r; bestScore = s; }
      }
      if (best && bestScore >= 0.35) current = best;
    }
    if (!current) return { content: [{ type: 'text', text: 'Provide id or message; reminder not found' }], isError: true };

    const info = this.db.prepare('DELETE FROM reminders WHERE id = ?').run(current.id);
    if (!info.changes) return { content: [{ type: 'text', text: 'Reminder not found' }], isError: true };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            __taskyCard: {
              kind: 'result',
              tool: 'tasky_delete_reminder',
              status: 'success',
              data: { success: true, id: current.id, title: current.message },
              meta: { operation: 'delete', timestamp: new Date().toISOString() }
            }
          })
        }
      ]
    };
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


