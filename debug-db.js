const { db } = require('./server/db');
const { storage } = require('./server/storage');

async function debugDatabase() {
  try {
    console.log('🔍 Debugging database...');
    
    // Check if database file exists and is accessible
    console.log('📁 Database file check...');
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.resolve('data/app.db');
    console.log('Database path:', dbPath);
    console.log('File exists:', fs.existsSync(dbPath));
    
    if (fs.existsSync(dbPath)) {
      console.log('File size:', fs.statSync(dbPath).size, 'bytes');
    }
    
    // Check table structure
    console.log('\n📊 Checking table structure...');
    const tables = db.prepare('SELECT name FROM sqlite_master WHERE type="table"').all();
    console.log('Tables found:', tables);
    
    for (const table of tables) {
      console.log(`\nTable: ${table.name}`);
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log('Columns:', columns.map(c => ({name: c.name, type: c.type, notnull: c.notnull})));
    }
    
    // Test specific methods
    console.log('\n🧪 Testing storage methods...');
    
    try {
      const teacher = await storage.getTeacherByEmail('test@example.com');
      console.log('✅ getTeacherByEmail works:', teacher);
    } catch (error) {
      console.error('❌ getTeacherByEmail error:', error.message);
      console.error('Stack:', error.stack);
    }
    
    try {
      const teacher = await storage.getTeacherByGoogleId('test-google-id');
      console.log('✅ getTeacherByGoogleId works:', teacher);
    } catch (error) {
      console.error('❌ getTeacherByGoogleId error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack:', error.stack);
  }
}

debugDatabase();
