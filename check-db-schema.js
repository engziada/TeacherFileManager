const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('🔍 Checking database schema:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('\n📊 Teachers table schema:');
  const schema = db.prepare('SELECT sql FROM sqlite_master WHERE type="table" AND name="teachers"').get();
  if (schema) {
    console.log('CREATE statement:', schema.sql);
  } else {
    console.log('❌ Teachers table not found!');
  }
  
  console.log('\n📋 All columns in teachers table:');
  const columns = db.prepare('PRAGMA table_info(teachers)').all();
  columns.forEach(col => {
    console.log(`- ${col.name} (${col.type}) ${col.pk ? '[PRIMARY KEY]' : ''} ${col.notnull ? '[NOT NULL]' : ''}`);
  });
  
  console.log('\n🔍 Looking for teacher_code column specifically:');
  const hasTeacherCode = columns.find(col => col.name === 'teacher_code');
  if (hasTeacherCode) {
    console.log('✅ teacher_code column exists');
  } else {
    console.log('❌ teacher_code column is MISSING!');
    console.log('Available columns:', columns.map(c => c.name).join(', '));
  }
  
  db.close();
} catch (error) {
  console.error('❌ Database check failed:', error);
}
