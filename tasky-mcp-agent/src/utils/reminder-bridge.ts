import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
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
  private configPath: string;

  constructor(configPath?: string) {
    // Default to electron-store location under current working dir if not provided
    this.configPath = configPath || path.join(process.cwd(), 'data', 'tasky-config-v2.json');
    this.ensureFile();
  }

  private ensureFile() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.configPath)) {
      fs.writeFileSync(this.configPath, JSON.stringify({ reminders: [], settings: {} }, null, 2), 'utf-8');
    }
  }

  private read(): any {
    const raw = fs.readFileSync(this.configPath, 'utf-8');
    try {
      return JSON.parse(raw);
    } catch {
      return { reminders: [], settings: {} };
    }
  }

  private write(data: any): void {
    fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2), 'utf-8');
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
    const db = this.read();
    const rem: Reminder = {
      id: this.genId(),
      message: String(message),
      time: String(time),
      days: days.map((d: any) => String(d)),
      enabled: enabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.reminders.push(rem);
    this.write(db);
    return { content: [{ type: 'text', text: JSON.stringify(rem) }] };
  }

  async updateReminder(args: any): Promise<CallToolResult> {
    const { id, updates } = args;
    const db = this.read();
    const idx = db.reminders.findIndex((r: Reminder) => r.id === id);
    if (idx < 0) return { content: [{ type: 'text', text: 'Reminder not found' }], isError: true };
    const current: Reminder = db.reminders[idx];
    const next: Reminder = { ...current, ...updates, updatedAt: new Date().toISOString() };
    db.reminders[idx] = next;
    this.write(db);
    return { content: [{ type: 'text', text: JSON.stringify(next) }] };
  }

  async deleteReminder(args: any): Promise<CallToolResult> {
    const { id } = args;
    const db = this.read();
    const countBefore = db.reminders.length;
    db.reminders = db.reminders.filter((r: Reminder) => r.id !== id);
    const removed = db.reminders.length < countBefore;
    if (!removed) return { content: [{ type: 'text', text: 'Reminder not found' }], isError: true };
    this.write(db);
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
  }

  async getReminder(args: any): Promise<CallToolResult> {
    const { id } = args;
    const db = this.read();
    const rem = db.reminders.find((r: Reminder) => r.id === id);
    if (!rem) return { content: [{ type: 'text', text: 'Reminder not found' }], isError: true };
    const summary = `Reminder ${rem.id}: ${rem.message}`;
    const normalizedPath = this.configPath.replace(/\\/g, '/');
    const fileUri = `file:///${normalizedPath}`;
    return {
      content: [
        { type: 'text', text: summary },
        { type: 'text', text: JSON.stringify(rem) },
        { type: 'resource_link', uri: fileUri, name: 'tasky-config-v2.json', mimeType: 'application/json', description: 'Reminders storage file' as any }
      ] as any
    };
  }

  async listReminders(args: any): Promise<CallToolResult> {
    const db = this.read();
    let items: Reminder[] = db.reminders || [];
    if (typeof args?.enabled === 'boolean') items = items.filter(r => !!r.enabled === args.enabled);
    if (args?.day) items = items.filter(r => r.days?.includes(String(args.day)));
    if (args?.search) {
      const s = String(args.search).toLowerCase();
      items = items.filter(r => r.message.toLowerCase().includes(s));
    }
    const normalizedPath = this.configPath.replace(/\\/g, '/');
    const fileUri = `file:///${normalizedPath}`;
    return {
      content: [
        { type: 'text', text: `Returned ${items.length} reminders` },
        { type: 'text', text: JSON.stringify(items) },
        { type: 'resource_link', uri: fileUri, name: 'tasky-config-v2.json', mimeType: 'application/json', description: 'Reminders storage file' as any }
      ] as any
    };
  }

  async toggleReminder(args: any): Promise<CallToolResult> {
    const { id, enabled } = args;
    const db = this.read();
    const idx = db.reminders.findIndex((r: Reminder) => r.id === id);
    if (idx < 0) return { content: [{ type: 'text', text: 'Reminder not found' }], isError: true };
    db.reminders[idx].enabled = !!enabled;
    db.reminders[idx].updatedAt = new Date().toISOString();
    this.write(db);
    return { content: [{ type: 'text', text: JSON.stringify(db.reminders[idx]) }] };
  }
}


