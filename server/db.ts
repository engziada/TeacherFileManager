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

const sqlite = new Database(dbFile);
export const db = drizzle(sqlite, { schema });

// Database schema is now properly managed, no need for defensive migrations
// The subject column has been removed as it's obsolete

// Ensure all tables exist
try {
  // Check and create teachers table
  const teachersTableExists = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='teachers'`).get();
  if (!teachersTableExists) {
    sqlite.prepare(`
      CREATE TABLE teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        school_name TEXT,
        profile_image_url TEXT,
        drive_folder_id TEXT,
        access_token TEXT,
        refresh_token TEXT,
        link_code TEXT UNIQUE,
        teacher_code TEXT UNIQUE,
        password_hash TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        last_login TEXT,
        is_active INTEGER DEFAULT 1,
        profile_complete INTEGER DEFAULT 0
      )
    `).run();
    console.log('[DB] Created teachers table');
  }

  // Check and create students table
  const studentsTableExists = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='students'`).get();
  if (!studentsTableExists) {
    sqlite.prepare(`
      CREATE TABLE students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        civil_id TEXT UNIQUE NOT NULL,
        student_name TEXT NOT NULL,
        grade TEXT NOT NULL,
        class_number INTEGER NOT NULL,
        academic_year TEXT NOT NULL DEFAULT '2024-2025',
        teacher_id INTEGER NOT NULL REFERENCES teachers(id),
        folder_created INTEGER DEFAULT 0,
        drive_folder_id TEXT,
        created_date TEXT DEFAULT (datetime('now')),
        is_active INTEGER DEFAULT 1
      )
    `).run();
    console.log('[DB] Created students table');
  }

  // Check and create files table
  const filesTableExists = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='files'`).get();
  if (!filesTableExists) {
    sqlite.prepare(`
      CREATE TABLE files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_civil_id TEXT NOT NULL,
        file_category TEXT NOT NULL,
        original_name TEXT NOT NULL,
        system_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        upload_date TEXT DEFAULT (datetime('now')),
        teacher_id INTEGER NOT NULL REFERENCES teachers(id),
        description TEXT,
        view_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
      )
    `).run();
    console.log('[DB] Created files table');
  }

  // Check and create captcha_questions table
  const captchaTableExists = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='captcha_questions'`).get();
  if (!captchaTableExists) {
    sqlite.prepare(`
      CREATE TABLE captcha_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      )
    `).run();
    console.log('[DB] Created captcha_questions table');
  }

  // Check and create subjects table
  const subjectsTableExists = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='subjects'`).get();
  if (!subjectsTableExists) {
    sqlite.prepare(`
      CREATE TABLE subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_ar TEXT NOT NULL
      )
    `).run();
    console.log('[DB] Created subjects table');
  }

  // Check and create teacher_subjects table
  const teacherSubjectsTableExists = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='teacher_subjects'`).get();
  if (!teacherSubjectsTableExists) {
    sqlite.prepare(`
      CREATE TABLE teacher_subjects (
        teacher_id INTEGER NOT NULL REFERENCES teachers(id),
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        PRIMARY KEY (teacher_id, subject_id)
      )
    `).run();
    console.log('[DB] Created teacher_subjects table');
  }

  // Check and create student_subjects table
  const studentSubjectsTableExists = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='student_subjects'`).get();
  if (!studentSubjectsTableExists) {
    sqlite.prepare(`
      CREATE TABLE student_subjects (
        student_id INTEGER NOT NULL REFERENCES students(id),
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        PRIMARY KEY (student_id, subject_id)
      )
    `).run();
    console.log('[DB] Created student_subjects table');
  }

  // Seed subjects table with initial data if it's empty
  const subjectCount = sqlite.prepare(`SELECT COUNT(*) as count FROM subjects`).get() as { count: number };
  if (subjectCount.count === 0) {
    const initialSubjects = [
      'اللغة العربية',
      'الرياضيات',
      'العلوم',
      'الدراسات الاجتماعية',
      'التربية الإسلامية',
      'القرآن الكريم',
      'اللغة الإنجليزية',
      'الفنون',
      'الرياضة',
      'التكنولوجيا'
    ];

    const insertStmt = sqlite.prepare(`INSERT INTO subjects (name_ar) VALUES (?)`);
    for (const subject of initialSubjects) {
      insertStmt.run(subject);
    }
    console.log(`[DB] Seeded subjects table with ${initialSubjects.length} initial subjects`);
  }
} catch (e) {
  console.error('[DB] Failed to create new tables:', e);
}