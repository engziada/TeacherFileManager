const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('🚀 Initializing database:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Create teachers table
  console.log('📝 Creating teachers table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      school_name TEXT,
      subject TEXT,
      google_id TEXT UNIQUE,
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
    );
  `);
  
  // Create indexes for teachers
  console.log('📝 Creating teachers indexes...');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_teachers_google_id ON teachers(google_id);
    CREATE INDEX IF NOT EXISTS idx_teachers_link_code ON teachers(link_code);
  `);
  
  // Create students table
  console.log('📝 Creating students table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      civil_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      teacher_id INTEGER NOT NULL,
      parent_phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    );
  `);
  
  // Create files table
  console.log('📝 Creating files table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_civil_id TEXT NOT NULL,
      teacher_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_category TEXT NOT NULL,
      subject TEXT NOT NULL,
      google_drive_id TEXT,
      google_drive_url TEXT,
      public_view_url TEXT,
      upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
      file_size INTEGER,
      mime_type TEXT,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    );
  `);
  
  // Create captcha_questions table
  console.log('📝 Creating captcha_questions table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS captcha_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('✅ Database initialized successfully!');
  
  // Verify tables were created
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📊 Created tables:', tables.map(t => t.name).join(', '));
  
  // Check teachers table structure
  const teacherCols = db.prepare('PRAGMA table_info(teachers)').all();
  console.log('👥 Teachers table columns:', teacherCols.map(c => c.name).join(', '));
  
  db.close();
} catch (error) {
  console.error('❌ Database initialization failed:', error);
}
