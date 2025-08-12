import { google } from 'googleapis';
import type { Teacher, Student } from '@shared/schema';

export function createDriveService(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

export async function createStudentFolders(
  students: Student[],
  teacher: Teacher
) {
  // Try Service Account first
  const { googleDriveService } = await import('./googleDriveService');
  
  if (googleDriveService.isConfigured()) {
    console.log('Using Service Account for Google Drive folder creation');
    
    let created = 0;
    let failed = 0;
    
    for (const student of students) {
      try {
        const result = await googleDriveService.createStudentFolder(teacher, student);
        if (result.success) {
          console.log(`✅ Created folder for ${student.studentName} with ID: ${result.folderId}`);
          created++;
        } else {
          console.log(`❌ Failed to create folder for ${student.studentName}: ${result.error}`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ Error creating folder for ${student.studentName}:`, error);
        failed++;
      }
    }
    
    console.log(`Service Account results: ${created} created, ${failed} failed`);
    return;
  }
  
  // Fallback to OAuth if Service Account not available
  if (!teacher.accessToken) {
    console.log('Neither Service Account nor OAuth token available - cannot create folders');
    return;
  }

  const driveService = createDriveService(teacher.accessToken);
  
  try {
    // Use the teacher's specified Drive folder or create one
    let mainFolderId: string | null = teacher.driveFolderId ?? null;
    
    if (!mainFolderId) {
      // Create main folder in teacher's Drive
      const mainFolder = await driveService.files.create({
        requestBody: {
          name: `مجلد ملفات الطلاب`,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      mainFolderId = mainFolder.data.id ?? null;
      if (!mainFolderId) {
        throw new Error('Failed to create main folder ID');
      }
      
      // Update teacher with new folder ID
      const { storage } = await import('./storage');
      await storage.updateTeacher(teacher.id, { driveFolderId: mainFolderId });
    }

    console.log(`Creating Google Drive folders for ${students.length} students...`);
    
    for (const student of students) {
      try {
        // Create student folder
        const studentFolder = await driveService.files.create({
          requestBody: {
            name: `${student.studentName} - ${student.civilId}`,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [mainFolderId as string],
          },
          fields: 'id',
        });

        const studentFolderId = studentFolder.data.id ?? null;
        if (!studentFolderId) {
          throw new Error('Failed to create student folder ID');
        }
        

        // Determine primary subject for this student
        let primarySubject = 'عام';
        try {
          const { storage } = await import('./storage');
          const studentSubjects = await storage.getStudentSubjects(student.id);
          primarySubject = studentSubjects.length > 0 ? (studentSubjects[0].nameAr || 'عام') : 'عام';
        } catch (e) {
          // Fallback already set to 'عام'
          console.warn('Failed to load student subjects, using default', e);
        }

        // Create subject folder
        const subjectFolder = await driveService.files.create({
          requestBody: {
            name: primarySubject,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [studentFolderId],
          },
          fields: 'id',
        });

        const subjectFolderId = subjectFolder.data.id ?? null;
        if (!subjectFolderId) {
          throw new Error('Failed to create subject folder ID');
        }
        

        // Create category folders
        const categories = [
          'اختبارات', 'درجات', 'واجبات', 'ملاحظات', 'إنذارات',
          'مشاركات', 'شهادات', 'حضور وغياب', 'سلوك', 'أخرى'
        ];

        for (const category of categories) {
          await driveService.files.create({
            requestBody: {
              name: category,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [subjectFolderId],
            },
            fields: 'id',
          });
        }

        console.log(`Created Google Drive folders for student: ${student.studentName}`);
      } catch (error) {
        console.error(`Failed to create folder for student ${student.studentName}:`, error);
      }
    }
  } catch (error) {
    console.error('Error creating Google Drive folders:', error);
    throw error;
  }
}

export async function uploadFileToDrive(
  accessToken: string,
  parentFolderId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
) {
  const driveService = createDriveService(accessToken);
  
  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId],
  };

  const media = {
    mimeType: mimeType,
    body: fileBuffer,
  };

  const response = await driveService.files.create({
    requestBody: fileMetadata,
    media: media,
  });

  return {
    fileId: response.data.id,
    webViewLink: `https://drive.google.com/file/d/${response.data.id}/view`
  };
}

export async function getFileDownloadUrl(accessToken: string, fileId: string): Promise<string> {
  const driveService = createDriveService(accessToken);
  
  const response = await driveService.files.get({
    fileId: fileId,
    fields: 'webViewLink'
  });
  
  return response.data.webViewLink || '';
}