import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import fs from 'node:fs';
import path from 'node:path';

function resolveSqlitePathFromEnv(url: string | undefined): string {
  if (!url) return path.resolve(process.cwd(), 'data', 'app.db');
  if (url.startsWith('sqlite://')) {
    // strip scheme
    const p = url.replace('sqlite://', '');
    return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  }
  // fallback to default file if a non-sqlite url is provided
  return path.resolve(process.cwd(), 'data', 'app.db');
}

const dbFile = resolveSqlitePathFromEnv(process.env.DATABASE_URL);
console.log(`Using SQLite database at: ${dbFile}`);
const dir = path.dirname(dbFile);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const sqlite = new Database(dbFile);
export const db = drizzle(sqlite, { schema });

export async function runMigrations() {
  // This function will be implemented to run migrations
  // For now, we'll just ensure the tables exist
  await ensureTablesExist();
}

async function ensureTablesExist() {
  // Check and create subjects table if it doesn't exist
  const subjectsTableExists = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='subjects'`).get();
  if (!subjectsTableExists) {
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nameAr TEXT NOT NULL UNIQUE,
        createdByTeacherId INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (createdByTeacherId) REFERENCES teachers(id) ON DELETE SET NULL
      )
    `).run();
    console.log('[DB] Created subjects table');
  }

  // Check and create teacher_subjects junction table if it doesn't exist
  const teacherSubjectsTableExists = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='teacher_subjects'`).get();
  if (!teacherSubjectsTableExists) {
    sqlite.prepare(`
      CREATE TABLE IF NOT EXISTS teacher_subjects (
        teacherId INTEGER NOT NULL,
        subjectId INTEGER NOT NULL,
        PRIMARY KEY (teacherId, subjectId),
        FOREIGN KEY (teacherId) REFERENCES teachers(id) ON DELETE CASCADE,
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
      )
    `).run();
    console.log('[DB] Created teacher_subjects table');
  }
}
