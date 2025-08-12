const { db } = require('./server/db');
const { storage } = require('./server/storage');

async function verifyFix() {
  console.log('🔍 Verifying SQLite error fix...');
  
  try {
    // Test database connection
    console.log('✅ Testing database connection...');
    const testResult = db.prepare('SELECT 1 as test').get();
    console.log('Database connected:', testResult);
    
    // Test table structure
    console.log('📊 Checking table structure...');
    const tables = db.prepare('SELECT name FROM sqlite_master WHERE type="table"').all();
    console.log('Tables:', tables.map(t => t.name));
    
    // Check teachers table columns
    const columns = db.prepare('PRAGMA table_info(teachers)').all();
    console.log('Teachers columns:', columns.map(c => c.name));
    
    // Test storage methods
    console.log('🧪 Testing storage methods...');
    
    // Test getTeacherByEmail
    const teacher = await storage.getTeacherByEmail('nonexistent@example.com');
    console.log('✅ getTeacherByEmail works:', teacher);
    
    // Test getTeacherByGoogleId
    const googleTeacher = await storage.getTeacherByGoogleId('nonexistent-google-id');
    console.log('✅ getTeacherByGoogleId works:', googleTeacher);
    
    // Test create teacher
    console.log('📝 Testing teacher creation...');
    const newTeacher = await storage.createTeacher({
      email: 'test@example.com',
      name: 'Test Teacher',
      schoolName: 'Test School',
      subject: 'Math',
      teacherCode: 'T-TEST001',
      linkCode: 'LINK-TEST001',
      isActive: true
    });
    console.log('✅ Teacher created:', newTeacher.id);
    
    // Test update teacher
    const updatedTeacher = await storage.updateTeacher(newTeacher.id, {
      name: 'Updated Test Teacher'
    });
    console.log('✅ Teacher updated:', updatedTeacher.name);
    
    console.log('🎉 All tests passed! SQLite error should be fixed.');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    console.error('Stack:', error.stack);
  }
}

verifyFix();
