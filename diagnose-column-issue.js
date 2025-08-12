const { db } = require('./server/db');

console.log('🔍 Diagnosing column name issue...');

try {
  // Check all table structures
  console.log('📊 Table structures:');
  const tables = db.prepare('SELECT name FROM sqlite_master WHERE type="table"').all();
  
  for (const table of tables) {
    console.log(`\nTable: ${table.name}`);
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log('Columns:', columns.map(c => ({name: c.name, type: c.type})));
  }
  
  // Test specific queries that might be failing
  console.log('\n🧪 Testing queries...');
  
  try {
    const result = db.prepare('SELECT * FROM teachers WHERE teacher_code = ?').get('test');
    console.log('Query with teacher_code:', result);
  } catch (e) {
    console.log('❌ Error with teacher_code:', e.message);
  }
  
  try {
    const result = db.prepare('SELECT * FROM teachers WHERE teacherCode = ?').get('test');
    console.log('Query with teacherCode:', result);
  } catch (e) {
    console.log('❌ Error with teacherCode:', e.message);
  }
  
} catch (error) {
  console.error('❌ Diagnostic failed:', error);
}
