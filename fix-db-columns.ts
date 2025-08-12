import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'app.db');
console.log('🔧 Fixing database columns:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Get current table structure
  const columns = db.prepare('PRAGMA table_info(teachers)').all();
  console.log('📋 Current columns:', columns.map((c: any) => c.name).join(', '));
  
  // Check and add missing columns one by one
  const requiredColumns = [
    { name: 'teacher_code', sql: 'ALTER TABLE teachers ADD COLUMN teacher_code TEXT UNIQUE' },
    { name: 'password_hash', sql: 'ALTER TABLE teachers ADD COLUMN password_hash TEXT' },
    { name: 'link_code', sql: 'ALTER TABLE teachers ADD COLUMN link_code TEXT UNIQUE' },
    { name: 'google_id', sql: 'ALTER TABLE teachers ADD COLUMN google_id TEXT UNIQUE' },
    { name: 'access_token', sql: 'ALTER TABLE teachers ADD COLUMN access_token TEXT' },
    { name: 'refresh_token', sql: 'ALTER TABLE teachers ADD COLUMN refresh_token TEXT' },
    { name: 'profile_image_url', sql: 'ALTER TABLE teachers ADD COLUMN profile_image_url TEXT' },
    { name: 'drive_folder_id', sql: 'ALTER TABLE teachers ADD COLUMN drive_folder_id TEXT' },
    { name: 'last_login', sql: 'ALTER TABLE teachers ADD COLUMN last_login TEXT' },
    { name: 'is_active', sql: 'ALTER TABLE teachers ADD COLUMN is_active INTEGER DEFAULT 1' },
    { name: 'profile_complete', sql: 'ALTER TABLE teachers ADD COLUMN profile_complete INTEGER DEFAULT 0' }
  ];
  
  for (const col of requiredColumns) {
    const exists = columns.find((c: any) => c.name === col.name);
    if (!exists) {
      try {
        console.log(`➕ Adding column: ${col.name}`);
        db.exec(col.sql);
        console.log(`✅ Added ${col.name} column`);
      } catch (e: any) {
        console.log(`⚠️ Failed to add ${col.name}:`, e.message);
      }
    } else {
      console.log(`✅ Column ${col.name} already exists`);
    }
  }
  
  // Verify final structure
  console.log('\n🔍 Final verification:');
  const finalColumns = db.prepare('PRAGMA table_info(teachers)').all();
  console.log('📋 All columns:', finalColumns.map((c: any) => c.name).join(', '));
  
  // Test the problematic query
  try {
    const testResult = db.prepare('SELECT teacher_code FROM teachers LIMIT 1').get();
    console.log('✅ teacher_code query test passed');
  } catch (e: any) {
    console.log('❌ teacher_code query test failed:', e.message);
  }
  
  db.close();
  console.log('✅ Database column fix completed!');
} catch (error) {
  console.error('❌ Database column fix failed:', error);
}
