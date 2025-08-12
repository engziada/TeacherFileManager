import { google } from 'googleapis';
import type { Teacher, Student } from '@shared/schema';

/**
 * Google Drive helpers (OAuth per-teacher)
 */
export class GoogleDriveService {
  private auth: any;
  private drive: any;

  constructor() {
    // Deprecated: Service Account init removed. Use OAuth helpers below.
    this.auth = null;
    this.drive = null;
  }

  // Deprecated: old Service Account utilities were removed.

  /**
   * Create a folder using Service Account in a shared location
   */
  async createStudentFolder(
    teacher: Teacher, 
    student: Student
  ): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      // Kept for backward compatibility but now uses OAuth helpers where possible.
      const drive = await getDriveForTeacher(teacher);
      if (!drive) return { success: false, error: 'Google Drive not connected' };

      const folderName = `${student.studentName} - ${student.civilId}`;
      const parentId = teacher.driveFolderId || undefined;
      const { folderId } = await ensureFolderPath(drive, [folderName], parentId);

      // Optional subject subfolder (derive from student's subjects many-to-many)
      try {
        const { storage } = await import('./storage');
        const subs = await storage.getStudentSubjects(student.id);
        const primarySubject = subs.length > 0 ? (subs[0].nameAr || 'عام') : 'عام';
        await ensureFolderPath(drive, [folderName, primarySubject], parentId);
      } catch (e) {
        // If unable to fetch subjects, create generic folder
        await ensureFolderPath(drive, [folderName, 'عام'], parentId);
      }

      // Make student folder viewable by link (reader)
      await drive.permissions.create({
        fileId: folderId!,
        requestBody: { role: 'reader', type: 'anyone' }
      });

      return { success: true, folderId, error: undefined };

    } catch (error) {
      console.error('Error creating student folder with Service Account:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Drive access error'
      };
    }
  }

  /**
   * Check if Service Account is properly configured
   */
  isConfigured(): boolean {
    // Always false now; use OAuth per teacher
    return false;
  }

  /**
   * Create folders for multiple students in batch
   */
  async createStudentFoldersBatch(
    teacher: Teacher,
    students: Student[]
  ): Promise<{
    success: boolean;
    created: number;
    failed: number;
    total: number;
    errors: string[];
  }> {
    const results = {
      success: true,
      created: 0,
      failed: 0,
      total: students.length,
      errors: [] as string[]
    };

    for (const student of students) {
      try {
        const result = await this.createStudentFolder(teacher, student);
        if (result.success) {
          results.created++;
        } else {
          results.failed++;
          results.errors.push(`${student.studentName}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${student.studentName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    results.success = results.failed === 0;
    return results;
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    folderId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      // Deprecated path; prefer uploadBufferToDrivePath
      console.warn('uploadFile(folderId, ...) is deprecated. Use uploadBufferToDrivePath.');
      return { success: false, error: 'Deprecated method' };

    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Find student folder by civil ID in teacher's main folder
   */
  async findStudentFolder(teacherFolderId: string, studentCivilId: string): Promise<string | null> {
    try {
      // Deprecated: requires service account. Use ensureFolderPath with OAuth drive client.
      console.warn('findStudentFolder is deprecated. Use ensureFolderPath with OAuth drive client.');
      return null;
    } catch (error) {
      console.error('Error finding student folder:', error);
      return null;
    }
  }

  /**
   * Delete student folder from Google Drive
   */
  async deleteStudentFolder(teacher: Teacher, folderName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const drive = await getDriveForTeacher(teacher);
      if (!drive) {
        return { success: false, error: 'Google Drive not connected' };
      }

      if (!teacher.driveFolderId) {
        return { success: false, error: 'Teacher Drive folder not configured' };
      }

      // Search for the student folder
      const searchResponse = await drive.files.list({
        q: `'${teacher.driveFolderId}' in parents and name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      });

      const folders = searchResponse.data.files;
      if (!folders || folders.length === 0) {
        return { success: false, error: 'Student folder not found' };
      }

      const folderId = folders[0].id;
      if (!folderId) {
        return { success: false, error: 'Invalid folder ID' };
      }

      // Delete the folder and all its contents
      await drive.files.delete({
        fileId: folderId
      });

      return { success: true };

    } catch (error) {
      console.error('Error deleting student folder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Drive access error'
      };
    }
  }

  /**
   * Delete specific subject folder within student folder
   */
  async deleteSubjectFolder(teacher: Teacher, studentName: string, civilId: string, subjectName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const drive = await getDriveForTeacher(teacher);
      if (!drive) {
        return { success: false, error: 'Google Drive not connected' };
      }

      if (!teacher.driveFolderId) {
        return { success: false, error: 'Teacher Drive folder not configured' };
      }

      const studentFolderName = `${studentName} - ${civilId}`;
      
      // First, find the student folder
      const studentFolderResponse = await drive.files.list({
        q: `'${teacher.driveFolderId}' in parents and name='${studentFolderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
        spaces: 'drive'
      });

      const studentFolders = studentFolderResponse.data.files;
      if (!studentFolders || studentFolders.length === 0) {
        return { success: false, error: 'Student folder not found' };
      }

      const studentFolderId = studentFolders[0].id;
      if (!studentFolderId) {
        return { success: false, error: 'Invalid student folder ID' };
      }

      // Now find the subject folder within the student folder
      const subjectFolderResponse = await drive.files.list({
        q: `'${studentFolderId}' in parents and name='${subjectName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
        spaces: 'drive'
      });

      const subjectFolders = subjectFolderResponse.data.files;
      if (!subjectFolders || subjectFolders.length === 0) {
        return { success: false, error: `Subject folder '${subjectName}' not found` };
      }

      const subjectFolderId = subjectFolders[0].id;
      if (!subjectFolderId) {
        return { success: false, error: 'Invalid subject folder ID' };
      }

      // Delete the subject folder
      await drive.files.delete({
        fileId: subjectFolderId
      });

      return { success: true };

    } catch (error) {
      console.error('Error deleting subject folder:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Drive access error'
      };
    }
  }
}

export const googleDriveService = new GoogleDriveService();

// ===== New OAuth-based helpers =====

export function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
  const redirectUri = `${baseUrl}/api/google-callback`;
  if (!clientId || !clientSecret) {
    console.warn('Google OAuth client env vars missing');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function getDriveForTeacher(teacher: Teacher) {
  if (!teacher?.accessToken) return null;
  const oauth2 = createOAuthClient();
  oauth2.setCredentials({
    access_token: (teacher as any).accessToken,
    refresh_token: (teacher as any).refreshToken || undefined,
  });
  return google.drive({ version: 'v3', auth: oauth2 });
}

export async function ensureFolderPath(
  drive: ReturnType<typeof google.drive>,
  pathParts: string[],
  rootParentId?: string
): Promise<{ folderId: string }> {
  let parentId = rootParentId;
  for (const name of pathParts) {
    // Try find existing
    const list = await drive.files.list({
      q: `${parentId ? `'${parentId}' in parents and ` : ''}name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id,name)',
      spaces: 'drive'
    });
    if (list.data.files && list.data.files.length > 0) {
      parentId = list.data.files[0]!.id!;
      continue;
    }
    // Create if missing
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {})
      },
      fields: 'id'
    });
    parentId = created.data.id!;
  }
  if (!parentId) throw new Error('Failed to ensure folder path');
  return { folderId: parentId };
}

import { Readable } from 'stream';

export async function uploadBufferToDrivePath(
  teacher: Teacher,
  pathParts: string[],
  fileName: string,
  buffer: Buffer,
  mimeType: string,
  rootParentId?: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = await getDriveForTeacher(teacher);
  if (!drive) throw new Error('Google Drive not connected');
  const { folderId } = await ensureFolderPath(drive, pathParts, rootParentId);
  
  // Convert Buffer to readable stream for Google Drive API
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // End of stream
  
  const response = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: stream },
    fields: 'id, webViewLink'
  });
  const fileId = response.data.id!;
  // Ensure public view permission
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' }
  });
  // Get webViewLink if not returned
  if (!response.data.webViewLink) {
    const meta = await drive.files.get({ fileId, fields: 'webViewLink' });
    return { fileId, webViewLink: meta.data.webViewLink! };
  }
  return { fileId, webViewLink: response.data.webViewLink! };
}