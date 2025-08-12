import Database from 'better-sqlite3';
import path from 'path';

// Connect to database
const dbPath = path.join(process.cwd(), 'data', 'app.db');
const db = new Database(dbPath);

console.log('🔧 Fixing database schema...');

try {
  // Drop and recreate teachers table with correct schema
  console.log('Recreating teachers table...');
  
  db.exec(`DROP TABLE IF EXISTS teachers`);
  
  db.exec(`
    CREATE TABLE teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      school_name TEXT,
      subject TEXT,
      profile_image_url TEXT,
      drive_folder_id TEXT,
      access_token TEXT,
      refresh_token TEXT,
      link_code TEXT UNIQUE,
      teacher_code TEXT UNIQUE,
      password_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT,
      is_active INTEGER DEFAULT 1,
      profile_complete INTEGER DEFAULT 0
    )
  `);
  
  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_teachers_google_id ON teachers(google_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_teachers_link_code ON teachers(link_code)`);
  
  // Create students table
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      civil_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      grade TEXT NOT NULL,
      class_number TEXT NOT NULL,
      subject TEXT,
      drive_folder_id TEXT,
      folder_created INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    )
  `);
  
  // Create files table
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      student_civil_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      system_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_url TEXT,
      file_size INTEGER,
      file_type TEXT,
      file_category TEXT DEFAULT 'general',
      subject TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    )
  `);
  
  // Create captcha table
  db.exec(`
    CREATE TABLE IF NOT EXISTS captcha_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ Database schema fixed successfully!');
  
  // Verify the schema
  const columns = db.prepare("PRAGMA table_info(teachers)").all();
  console.log('Teachers table columns:', columns.map(col => col.name));
  
} catch (error) {
  console.error('❌ Error fixing database schema:', error);
} finally {
  db.close();
}
