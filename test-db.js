const { db } = require('./server/db');
const { storage } = require('./server/storage');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = db.prepare('SELECT 1 as test').get();
    console.log('✓ Database connected:', result);
    
    // Test table existence
    const tables = db.prepare('SELECT name FROM sqlite_master WHERE type="table"').all();
    console.log('✓ Tables found:', tables.map(t => t.name));
    
    // Test storage methods
    console.log('Testing storage methods...');
    const teacher = await storage.getTeacherByEmail('test@example.com');
    console.log('✓ getTeacherByEmail works:', teacher);
    
    console.log('All database tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

testDatabase();
