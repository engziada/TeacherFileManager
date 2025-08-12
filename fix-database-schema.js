const Database = require('better-sqlite3');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'data', 'app.db');
const db = new Database(dbPath);

console.log('Checking and fixing database schema...');

try {
  // Check if teachers table exists
  const tablesResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='teachers'").get();
  
  if (!tablesResult) {
    console.log('Teachers table does not exist. Creating...');
    
    // Create teachers table with all required columns
    db.exec(`
      CREATE TABLE IF NOT EXISTS teachers (
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
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_teachers_google_id ON teachers(google_id);
      CREATE INDEX IF NOT EXISTS idx_teachers_link_code ON teachers(link_code);
    `);
    
    console.log('✅ Teachers table created successfully');
  } else {
    console.log('Teachers table exists. Checking columns...');
    
    // Get current table schema
    const columns = db.prepare("PRAGMA table_info(teachers)").all();
    const columnNames = columns.map(col => col.name);
    
    console.log('Current columns:', columnNames);
    
    // Check for missing columns and add them
    const requiredColumns = {
      'teacher_code': 'TEXT UNIQUE',
      'subject': 'TEXT',
      'profile_complete': 'INTEGER DEFAULT 0',
      'drive_folder_id': 'TEXT',
      'access_token': 'TEXT',
      'refresh_token': 'TEXT'
    };
    
    for (const [columnName, columnDef] of Object.entries(requiredColumns)) {
      if (!columnNames.includes(columnName)) {
        console.log(`Adding missing column: ${columnName}`);
        try {
          db.exec(`ALTER TABLE teachers ADD COLUMN ${columnName} ${columnDef}`);
          console.log(`✅ Added column: ${columnName}`);
        } catch (error) {
          console.log(`⚠️ Could not add column ${columnName}:`, error.message);
        }
      }
    }
  }
  
  // Create other required tables
  console.log('Creating other required tables...');
  
  // Students table
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
  
  // Files table
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
  
  // Captcha table
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
  
  // Verify the fix
  const finalColumns = db.prepare("PRAGMA table_info(teachers)").all();
  console.log('Final teachers table columns:', finalColumns.map(col => col.name));
  
} catch (error) {
  console.error('❌ Error fixing database schema:', error);
} finally {
  db.close();
}
