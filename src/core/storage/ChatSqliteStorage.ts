import Database from 'better-sqlite3';

export type ChatMessageRecord = {
  id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string; // ISO
};

export class ChatSqliteStorage {
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
    try { this.db.pragma('foreign_keys = ON'); } catch {}
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user','assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id, created_at);
    `);
  }

  private genId(prefix: string): string {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const rnd = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${ts}_${rnd}`;
  }

  createChat(title?: string): string {
    this.initialize();
    const id = this.genId('chat');
    const now = new Date().toISOString();
    this.db!.prepare(`INSERT INTO chats (id,title,created_at,updated_at) VALUES (@id,@title,@created,@updated)`)
      .run({ id, title: title || null, created: now, updated: now });
    return id;
  }

  listChats(limit: number = 20): { id: string; title: string | null; createdAt: string; updatedAt: string }[] {
    this.initialize();
    const rows = this.db!.prepare(`SELECT id,title,created_at as createdAt,updated_at as updatedAt FROM chats ORDER BY updated_at DESC LIMIT ?`).all(limit);
    return rows as any;
  }

  loadMessages(chatId: string): ChatMessageRecord[] {
    this.initialize();
    const rows = this.db!.prepare(`SELECT id, chat_id as chatId, role, content, created_at as createdAt FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC`).all(chatId);
    return rows as any;
  }

  appendMessage(chatId: string, role: 'user' | 'assistant', content: string): ChatMessageRecord {
    this.initialize();
    const id = this.genId('msg');
    const now = new Date().toISOString();
    const insert = this.db!.prepare(`INSERT INTO chat_messages (id,chat_id,role,content,created_at) VALUES (@id,@chat_id,@role,@content,@created_at)`);
    const updateChat = this.db!.prepare(`UPDATE chats SET updated_at=@updated WHERE id=@id`);
    const t = this.db!.transaction(() => {
      insert.run({ id, chat_id: chatId, role, content, created_at: now });
      updateChat.run({ id: chatId, updated: now });
    });
    t();
    return { id, chatId, role, content, createdAt: now };
  }

  saveTranscript(chatId: string, messages: { role: 'user' | 'assistant'; content: string }[]): void {
    this.initialize();
    const now = new Date().toISOString();
    const del = this.db!.prepare(`DELETE FROM chat_messages WHERE chat_id = ?`);
    const ins = this.db!.prepare(`INSERT INTO chat_messages (id,chat_id,role,content,created_at) VALUES (@id,@chat_id,@role,@content,@created_at)`);
    const upd = this.db!.prepare(`UPDATE chats SET updated_at=@updated WHERE id=@id`);
    const t = this.db!.transaction(() => {
      del.run(chatId);
      for (const m of messages) {
        ins.run({ id: this.genId('msg'), chat_id: chatId, role: m.role, content: m.content, created_at: now });
      }
      upd.run({ id: chatId, updated: now });
    });
    t();
  }

  deleteChat(chatId: string): void {
    this.initialize();
    const t = this.db!.transaction(() => {
      this.db!.prepare('DELETE FROM chat_messages WHERE chat_id = ?').run(chatId);
      this.db!.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
    });
    t();
  }

  resetAll(): void {
    this.initialize();
    const t = this.db!.transaction(() => {
      this.db!.exec('DELETE FROM chat_messages; DELETE FROM chats;');
    });
    t();
  }
}


