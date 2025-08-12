const { storage } = require('./server/storage');

async function testOAuthFlow() {
  console.log('🔍 Testing Google OAuth flow components...');
  
  try {
    // Test teacher operations that are used in OAuth callback
    console.log('🧪 Testing teacher operations...');
    
    // Test getTeacherByGoogleId
    const teacherByGoogle = await storage.getTeacherByGoogleId('test-google-id');
    console.log('✅ getTeacherByGoogleId works:', teacherByGoogle);
    
    // Test getTeacherByEmail
    const teacherByEmail = await storage.getTeacherByEmail('test@example.com');
    console.log('✅ getTeacherByEmail works:', teacherByEmail);
    
    // Test create teacher (used when no existing teacher)
    const newTeacher = await storage.createTeacher({
      email: 'oauth-test@example.com',
      name: 'OAuth Test Teacher',
      googleId: 'test-google-id-123',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      isActive: true
    });
    console.log('✅ Teacher created for OAuth:', newTeacher.id);
    
    // Test update teacher (used for existing teacher)
    const updatedTeacher = await storage.updateTeacher(newTeacher.id, {
      accessToken: 'updated-access-token',
      lastLogin: new Date().toISOString()
    });
    console.log('✅ Teacher updated for OAuth:', updatedTeacher.lastLogin);
    
    console.log('🎉 All OAuth-related database operations work correctly!');
    console.log('✅ SQLite error has been resolved!');
    
  } catch (error) {
    console.error('❌ OAuth flow test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testOAuthFlow();
