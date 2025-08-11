#!/usr/bin/env node
/*
  Migrate tasks from JSON file (Tasky 2.0/data/tasky-tasks.json) into SQLite (Tasky 2.0/data/tasky.db)
  Usage:
    node scripts/migrate-json-to-sqlite.js --json "data/tasky-tasks.json" --db "data/tasky.db"
*/
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') { out.json = args[++i]; }
    else if (a === '--db') { out.db = args[++i]; }
  }
  if (!out.json) out.json = path.join(process.cwd(), 'data', 'tasky-tasks.json');
  if (!out.db) out.db = path.join(process.cwd(), 'data', 'tasky.db');
  return out;
}

function ensureSchema(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.exec(`
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

function toIso(v) { return v ? new Date(v).toISOString() : null; }

function main() {
  const { json, db: dbPath } = parseArgs();
  if (!fs.existsSync(json)) {
    console.error('JSON file not found:', json);
    process.exit(1);
  }
  const raw = fs.readFileSync(json, 'utf-8');
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    process.exit(1);
  }
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  const db = new Database(dbPath);
  ensureSchema(db);

  const upsert = db.prepare(`
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
  `);
  const delTags = db.prepare('DELETE FROM task_tags WHERE task_id = ?');
  const insTag = db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?,?)');

  let created = 0, updated = 0;
  const tx = db.transaction(() => {
    for (const t of tasks) {
      const before = db.prepare('SELECT 1 FROM tasks WHERE id=?').get(t.schema.id);
      upsert.run({
        id: t.schema.id,
        title: t.schema.title || '',
        description: t.schema.description || null,
        status: t.status || 'PENDING',
        created_at: toIso(t.schema.createdAt) || new Date().toISOString(),
        updated_at: toIso(t.schema.updatedAt) || toIso(t.metadata?.lastModified) || new Date().toISOString(),
        due_date: toIso(t.schema.dueDate),
        human_approved: t.humanApproved ? 1 : 0,
        reminder_enabled: t.reminderEnabled ? 1 : 0,
        result: t.result || null,
        completed_at: toIso(t.completedAt),
        assigned_agent: t.schema.assignedAgent || null,
        execution_path: t.schema.executionPath || null,
        metadata: t.metadata ? JSON.stringify(t.metadata) : null
      });
      delTags.run(t.schema.id);
      for (const tag of (t.schema.tags || [])) {
        insTag.run(t.schema.id, String(tag));
      }
      if (before) updated++; else created++;
    }
  });
  tx();

  console.log(`Migrated tasks to ${dbPath}: created=${created}, updated=${updated}`);
}

main();


