import Database from 'better-sqlite3';
import type { Reminder } from '../../types';

export class ReminderSqliteStorage {
  private dbPath: string;
  private db?: Database.Database;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  initialize(): void {
    if (this.db) return;
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  getReminders(): Reminder[] {
    this.initialize();
    const rows = this.db!.prepare('SELECT * FROM reminders').all();
    return rows.map((r: any) => ({
      id: String(r.id),
      message: String(r.message),
      time: String(r.time),
      days: r.days ? JSON.parse(r.days) : [],
      enabled: !!r.enabled
    }));
  }

  addReminder(reminder: Reminder): boolean {
    this.initialize();
    const nowIso = new Date().toISOString();
    this.db!.prepare(`
      INSERT INTO reminders (id,message,time,days,enabled,created_at,updated_at)
      VALUES (@id,@message,@time,@days,@enabled,@created_at,@updated_at)
      ON CONFLICT(id) DO UPDATE SET
        message=excluded.message,
        time=excluded.time,
        days=excluded.days,
        enabled=excluded.enabled,
        updated_at=excluded.updated_at
    `).run({
      id: reminder.id,
      message: reminder.message,
      time: reminder.time,
      days: JSON.stringify(reminder.days || []),
      enabled: reminder.enabled ? 1 : 0,
      created_at: nowIso,
      updated_at: nowIso
    });
    return true;
  }

  updateReminder(id: string, updates: Partial<Reminder>): boolean {
    this.initialize();
    const current = this.getReminderById(id);
    if (!current) return false;
    const merged: Reminder = { ...current, ...updates } as Reminder;
    return this.addReminder(merged);
  }

  deleteReminder(id: string): boolean {
    this.initialize();
    const info = this.db!.prepare('DELETE FROM reminders WHERE id = ?').run(id);
    return info.changes > 0;
  }

  getReminderById(id: string): Reminder | null {
    this.initialize();
    const r: any = this.db!.prepare('SELECT * FROM reminders WHERE id = ?').get(id);
    if (!r) return null;
    return {
      id: String(r.id),
      message: String(r.message),
      time: String(r.time),
      days: r.days ? JSON.parse(r.days) : [],
      enabled: !!r.enabled
    };
  }

  getActiveReminders(): Reminder[] {
    this.initialize();
    const rows = this.db!.prepare('SELECT * FROM reminders WHERE enabled = 1').all();
    return rows.map((r: any) => ({
      id: String(r.id),
      message: String(r.message),
      time: String(r.time),
      days: r.days ? JSON.parse(r.days) : [],
      enabled: !!r.enabled
    }));
  }

  getLastUpdated(): number {
    this.initialize();
    const result: any = this.db!.prepare('SELECT MAX(updated_at) as max_updated FROM reminders').get();
    if (result?.max_updated) {
      return new Date(result.max_updated).getTime();
    }
    return 0;
  }
}


