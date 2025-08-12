const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('🔍 Inspecting database:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('\n📊 Teachers table structure:');
  const schema = db.prepare('SELECT sql FROM sqlite_master WHERE type="table" AND name="teachers"').get();
  console.log('Schema:', schema?.sql);
  
  console.log('\n📋 Columns in teachers table:');
  const columns = db.prepare('PRAGMA table_info(teachers)').all();
  columns.forEach(col => {
    console.log(`- ${col.name} (${col.type})`);
  });
  
  console.log('\n🧪 Testing queries:');
  try {
    const result = db.prepare('SELECT id, name, email, teacherCode FROM teachers LIMIT 1').get();
    console.log('Query with teacherCode:', result);
  } catch (e) {
    console.log('❌ Error with teacherCode:', e.message);
  }
  
  try {
    const result = db.prepare('SELECT id, name, email, teacher_code FROM teachers LIMIT 1').get();
    console.log('Query with teacher_code:', result);
  } catch (e) {
    console.log('❌ Error with teacher_code:', e.message);
  }
  
  db.close();
} catch (error) {
  console.error('❌ Database inspection failed:', error);
}
