import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import Database from 'better-sqlite3'

let db: Database.Database | null = null

/** 백업 복원 등 파일 교체 전에 DB 연결을 닫는다 */
export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function getDb(): Database.Database {
  if (db) return db
  const dir = app.getPath('userData')
  fs.mkdirSync(dir, { recursive: true })
  db = new Database(path.join(dir, 'whenimail.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      mobile TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      memo TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject_tpl TEXT NOT NULL DEFAULT '',
      body_tpl TEXT NOT NULL DEFAULT '',
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS draft_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES contact(id) ON DELETE SET NULL,
      template_id INTEGER REFERENCES template(id) ON DELETE SET NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      template_name TEXT NOT NULL,
      subject_rendered TEXT NOT NULL,
      adapter TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_contact_name ON contact(name);
    CREATE INDEX IF NOT EXISTS idx_contact_email ON contact(email);
    CREATE INDEX IF NOT EXISTS idx_draft_log_created ON draft_log(created_at);
  `)

  // v2: 명함 이미지 경로 (기존 DB 마이그레이션)
  const contactCols = db.pragma('table_info(contact)') as { name: string }[]
  if (!contactCols.some((c) => c.name === 'card_image_path')) {
    db.exec(`ALTER TABLE contact ADD COLUMN card_image_path TEXT NOT NULL DEFAULT ''`)
  }
}
