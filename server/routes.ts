import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from './storage';
import { fileStorage } from "./fileStorage";
import multer from "multer";
import * as XLSX from "xlsx";
import { z } from "zod";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Subject management endpoints
  app.get('/api/subjects', async (req, res) => {
    try {
      const allSubjects = await storage.getAllSubjects();
      res.json(allSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({ message: 'Failed to fetch subjects' });
    }
  });

  app.post('/api/teacher/:teacherId/onboarding', async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { schoolName, subjectNames } = req.body;

      // Basic validation
      if (!schoolName || !Array.isArray(subjectNames) || subjectNames.length === 0) {
        return res.status(400).json({ message: 'School name and at least one subject are required.' });
      }

      const teacherIdNum = parseInt(teacherId, 10);
      if (isNaN(teacherIdNum)) {
        return res.status(400).json({ message: 'Invalid teacher ID' });
      }

      // Use the new storage method and get updated teacher
      const updatedTeacher = await storage.updateTeacherOnboarding(teacherIdNum, schoolName, subjectNames);

      res.status(200).json({ 
        message: 'Onboarding completed successfully.',
        teacher: updatedTeacher
      });

    } catch (error) {
      console.error('Error during teacher onboarding:', error);
      res.status(500).json({ 
        message: 'Failed to complete onboarding process.',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Initialize default captcha questions
  // Initialize default captcha questions
  await initializeCaptchaQuestions();

  // Google OAuth signup route
  app.get('/api/google-signup', async (req, res) => {
    try {
      console.log('Generating Google signup URL');
      console.log('Environment check - Client ID exists:', !!process.env.GOOGLE_CLIENT_ID);
      console.log('Environment check - Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
      
      const { google } = await import('googleapis');
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${baseUrl}/api/google-callback`
      );

      const scopes = [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: 'signup' // Use 'signup' state for new registrations
      });

      console.log('Generated signup auth URL:', authUrl);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error generating Google signup URL:', error);
      res.status(500).json({ 
        message: 'Failed to generate signup URL', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Direct Google OAuth route (assumes teacher ID 14 for demo)
  app.get('/api/auth/google', async (req, res) => {
    try {
      const { google } = await import('googleapis');
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${baseUrl}/api/google-callback`
      );

      const scopes = [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: 'signup' // Signup/login flow via Google OAuth
      });

      res.redirect(authUrl);
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      res.status(500).send('Failed to generate auth URL');
    }
  });

  // Google OAuth for Drive access
  app.get('/api/teacher/:teacherId/connect-google', async (req, res) => {
    try {
      console.log('Generating Google auth URL for teacher:', req.params.teacherId);
      console.log('Environment check - Client ID exists:', !!process.env.GOOGLE_CLIENT_ID);
      console.log('Environment check - Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
      
      const { google } = await import('googleapis');
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${baseUrl}/api/google-callback`
      );

      const scopes = [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: req.params.teacherId // Pass teacher ID in state
      });

      console.log('Generated auth URL:', authUrl);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      res.status(500).json({ 
        message: 'Failed to generate auth URL', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Google OAuth login route (same as signup for simplicity)
  app.get('/api/auth/google', async (req, res) => {
    try {
      console.log('Generating Google login URL');
      console.log('Environment check - Client ID exists:', !!process.env.GOOGLE_CLIENT_ID);
      console.log('Environment check - Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
      
      const { google } = await import('googleapis');
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${baseUrl}/api/google-callback`
      );

      const scopes = [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: 'signup' // Use 'signup' state for both login and signup
      });

      console.log('Generated login auth URL:', authUrl);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error generating Google login URL:', error);
      res.status(500).json({ 
        message: 'Failed to generate login URL', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/google-callback', async (req, res) => {
    try {
      const { google } = await import('googleapis');
      const { code, state } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.redirect('/teacher-login?error=no_code');
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.APP_BASE_URL || 'http://localhost:5000'}/api/google-callback`
      );

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Branch by state: signup vs connect-google (numeric teacherId)
      const isSignup = state === 'signup';
      const isNumericState = state && typeof state === 'string' && /^\d+$/.test(state);

      if (isSignup) {
        // Fetch Google user info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: user } = await oauth2.userinfo.get();
        const googleId = user.id || null;
        const email = user.email || null;
        const name = user.name || (email ? email.split('@')[0] : 'Teacher');
        const picture = user.picture || null;

        if (!email) {
          return res.redirect(`/teacher-login?error=missing_email_from_google`);
        }

        // Upsert teacher by googleId/email
        let existingTeacher = googleId ? await storage.getTeacherByGoogleId(googleId) : undefined;
        if (!existingTeacher) {
          existingTeacher = await storage.getTeacherByEmail(email);
        }

        let teacher;
        const isNewTeacher = !existingTeacher;

        // Create unique Google Drive folder for new teachers
        let driveFolderId = null;
        if (isNewTeacher && tokens.access_token) {
          try {
            const driveAuth = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET
            );
            driveAuth.setCredentials({ access_token: tokens.access_token });
            const drive = google.drive({ version: 'v3', auth: driveAuth });
            
            // Create main folder in teacher's Google Drive
            const folderName = `مجلد ملفات الطلاب`;
            const mainFolder = await drive.files.create({
              requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
              },
              fields: 'id',
            });
            
            driveFolderId = mainFolder.data.id || null;
            console.log(`Created unique Google Drive folder for new teacher: ${driveFolderId}`);
          } catch (driveError) {
            console.error('Error creating Google Drive folder:', driveError);
            // Continue without folder - teacher can create manually later
          }
        }

        if (existingTeacher) {
          teacher = await storage.updateTeacher(existingTeacher.id, {
            googleId: googleId || existingTeacher.googleId || null,
            accessToken: tokens.access_token || null,
            refreshToken: tokens.refresh_token || null,
            profileImageUrl: picture || existingTeacher.profileImageUrl || null,
            driveFolderId: driveFolderId || existingTeacher.driveFolderId || null,
            lastLogin: new Date().toISOString()
          });
        } else {
          teacher = await storage.createTeacher({
            email,
            name: name || email,
            googleId: googleId || undefined,
            profileImageUrl: picture || undefined,
            accessToken: tokens.access_token || undefined,
            refreshToken: tokens.refresh_token || undefined,
            driveFolderId: driveFolderId || undefined,
            isActive: true,
            profileComplete: false  // New teachers need to complete profile
          } as any);
          
          // Generate and update link_code for new teachers
          const { generateLinkCode } = await import('./googleAuth');
          const linkCode = generateLinkCode(teacher.name || teacher.email);
          teacher = await storage.updateTeacher(teacher.id, { linkCode });
        }

        // Redirect to onboarding for new teachers who haven't completed profile
        if (!teacher.profileComplete) {
          return res.redirect(`/teacher-onboarding?teacherId=${teacher.id}`);
        }
        
        // For existing teachers with complete profiles, redirect to dashboard
        return res.redirect(`/teacher-dashboard/${teacher.id}?google_connected=true`);
      }

      if (isNumericState) {
        const teacherId = parseInt(state, 10);
        
        // Fetch Google user info to verify the account
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: user } = await oauth2.userinfo.get();
        const googleId = user.id || null;
        const email = user.email || null;
        const name = user.name || (email ? email.split('@')[0] : 'Teacher');
        const picture = user.picture || null;

        if (!email) {
          return res.redirect(`/teacher-dashboard/${teacherId}?error=missing_email_from_google`);
        }

        // Get the teacher to verify connection
        const teacher = await storage.getTeacher(teacherId);
        if (!teacher) {
          return res.redirect(`/teacher-login?error=teacher_not_found`);
        }

        // Security check: If teacher already has a Google account linked, verify it matches
        if (teacher.email && teacher.email !== email) {
          console.warn(`Security: Teacher ${teacherId} tried to connect different Google account. Teacher email: ${teacher.email}, Google email: ${email}`);
          return res.redirect(`/teacher-dashboard/${teacherId}?error=email_mismatch&expected=${encodeURIComponent(teacher.email)}&provided=${encodeURIComponent(email)}`);
        }

        // Create unique Google Drive folder if not exists
        let driveFolderId = teacher.driveFolderId;
        if (!driveFolderId && tokens.access_token) {
          try {
            const driveAuth = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET
            );
            driveAuth.setCredentials({ access_token: tokens.access_token });
            const drive = google.drive({ version: 'v3', auth: driveAuth });
            
            // Create main folder in teacher's Google Drive
            const folderName = 'مجلد ملفات الطلاب';
            const mainFolder = await drive.files.create({
              requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
              },
              fields: 'id',
            });
            
            driveFolderId = mainFolder.data.id || null;
            console.log(`Created unique Google Drive folder for teacher ${teacherId}: ${driveFolderId}`);
          } catch (driveError) {
            console.error('Error creating Google Drive folder:', driveError);
            // Continue without folder - teacher can create manually later
          }
        }

        // Update teacher with Google account info and tokens
        await storage.updateTeacher(teacherId, {
          email: teacher.email || email, // Use existing email or set from Google
          googleId: googleId || teacher.googleId || null,
          accessToken: tokens.access_token || null,
          refreshToken: tokens.refresh_token || null,
          profileImageUrl: picture || teacher.profileImageUrl || null,
          driveFolderId: driveFolderId || teacher.driveFolderId || null,
          lastLogin: new Date().toISOString()
        });
        
        return res.redirect(`/teacher-dashboard/${teacherId}?google_connected=true&email=${encodeURIComponent(email)}`);
      }

      // Unknown state
      return res.redirect(`/teacher-login?error=invalid_oauth_state`);
    } catch (error) {
      // Dev-friendly logging and reason propagation (without leaking sensitive data)
      const isProd = process.env.NODE_ENV === 'production';
      const err: any = error;
      const reasonCandidate =
        err?.code ||
        err?.response?.data?.error ||
        err?.response?.data?.error_description ||
        err?.response?.status ||
        err?.message ||
        'unknown';

      const reason = encodeURIComponent(String(reasonCandidate)).slice(0, 100);

      // Always log to console
      console.error('Error handling Google callback:', {
        message: err?.message,
        code: err?.code,
        status: err?.response?.status,
        data: err?.response?.data ? (typeof err.response.data === 'object' ? err.response.data : String(err.response.data)) : undefined,
      });

      // Write to Logs/oauth.log in non-production
      if (!isProd) {
        try {
          const logsDir = path.join(process.cwd(), 'Logs');
          if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
          }
          const logPath = path.join(logsDir, 'oauth.log');
          const logEntry = {
            timestamp: new Date().toISOString(),
            context: 'google-callback',
            message: err?.message,
            code: err?.code,
            status: err?.response?.status,
            data: err?.response?.data && typeof err.response.data === 'object' ? err.response.data : undefined,
            stack: err?.stack,
          };
          fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        } catch (logErr) {
          console.error('Failed to write OAuth log:', logErr);
        }
      }

      // Append reason only in non-production to aid debugging
      const url = !isProd
        ? `/teacher-login?error=google_auth_failed&reason=${reason}`
        : `/teacher-login?error=google_auth_failed`;
      res.redirect(url);
    }
  });

  // Teacher routes
  app.get("/api/teacher/:teacherId", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const teacher = await storage.getTeacher(teacherId);
      
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      res.json(teacher);
    } catch (error) {
      console.error("Error fetching teacher:", error);
      res.status(500).json({ message: "Failed to fetch teacher" });
    }
  });

  // Get teacher by Google ID
  app.get("/api/teacher/by-google/:googleId", async (req, res) => {
    try {
      const { googleId } = req.params;
      const teacher = await storage.getTeacherByGoogleId(googleId);
      
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      res.json({ teacher });
    } catch (error) {
      console.error("Error fetching teacher by Google ID:", error);
      res.status(500).json({ message: "Failed to fetch teacher" });
    }
  });

  app.get("/api/teacher/:teacherId/stats", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const stats = await storage.getTeacherStats(teacherId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching teacher stats:", error);
      res.status(500).json({ message: "Failed to fetch teacher stats" });
    }
  });

  app.get("/api/teacher/:teacherId/student-file-counts", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const fileCounts = await storage.getStudentFileCounts(teacherId);
      res.json(fileCounts);
    } catch (error) {
      console.error("Error fetching student file counts:", error);
      res.status(500).json({ message: "Failed to fetch student file counts" });
    }
  });

  app.post("/api/teacher/:teacherId/drive-link", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const { driveFolderLink } = req.body;

      // If empty string is sent, clear the drive folder ID
      if (driveFolderLink === "") {
        const updatedTeacher = await storage.updateTeacher(teacherId, {
          driveFolderId: null
        });
        return res.json({ 
          message: "Drive folder link cleared successfully", 
          teacher: updatedTeacher 
        });
      }

      if (!driveFolderLink || typeof driveFolderLink !== 'string') {
        return res.status(400).json({ message: "Drive folder link is required" });
      }

      // Extract folder ID from the link
      const { extractFolderIdFromLink } = await import('./googleDriveSimple');
      const folderId = extractFolderIdFromLink(driveFolderLink);
      
      if (!folderId) {
        return res.status(400).json({ message: "Invalid Google Drive folder link" });
      }

      // Update teacher with the folder ID
      const updatedTeacher = await storage.updateTeacher(teacherId, {
        driveFolderId: folderId
      });

      res.json({ 
        message: "Drive folder link saved successfully", 
        teacher: updatedTeacher 
      });
    } catch (error) {
      console.error("Error saving drive link:", error);
      res.status(500).json({ message: "Failed to save drive link" });
    }
  });

  // Onboarding: enrich teacher profile after first Google login
  app.post('/api/teacher/:teacherId/onboarding', async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const { schoolName, subject, driveFolderLink } = req.body as { schoolName?: string; subject?: string; driveFolderLink?: string };

      const teacher = await storage.getTeacher(teacherId);
      if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

      let driveFolderId: string | null | undefined = teacher.driveFolderId;
      if (driveFolderLink && typeof driveFolderLink === 'string' && driveFolderLink.trim()) {
        const { extractFolderIdFromLink } = await import('./googleDriveSimple');
        const folderId = extractFolderIdFromLink(driveFolderLink.trim());
        if (!folderId) return res.status(400).json({ message: 'Invalid Google Drive folder link' });
        driveFolderId = folderId;
      }

      // Generate a teacherCode if missing
      const ensureTeacherCode = (existing?: string | null) => existing && existing.trim() ? existing : `T-${Date.now().toString(36).slice(-6).toUpperCase()}`;

      const updated = await storage.updateTeacher(teacherId, {
        schoolName: schoolName ?? teacher.schoolName ?? null,
        subject: subject ?? (teacher as any).subject ?? null,
        driveFolderId: driveFolderId ?? null,
        teacherCode: ensureTeacherCode((teacher as any).teacherCode),
        profileComplete: true
      } as any);

      res.json({ message: 'Onboarding saved', teacher: updated });
    } catch (error) {
      console.error('Error in onboarding:', error);
      res.status(500).json({ message: 'Failed to save onboarding data' });
    }
  });

  app.post("/api/teacher/:teacherId/create-student-folders", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      
      // Get teacher and verify Google Drive connection
      const teacher = await storage.getTeacher(teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      if (!teacher.driveFolderId) {
        return res.status(400).json({ message: "Google Drive folder not configured" });
      }

      // Get only active students for this teacher who haven't had folders created yet
      const allStudents = await storage.getStudentsByTeacher(teacherId);
      const students = allStudents.filter(student => student.isActive && !student.folderCreated);
      
      if (students.length === 0) {
        return res.status(400).json({ message: "No new students found or all folders already created" });
      }

      let created = 0;
      let failed = 0;
      let skipped = 0;
      const details: string[] = [];

      console.log(`Starting folder creation for ${students.length} students...`);
      
      // Process students in batches for better performance
      const batchSize = 3;
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        const batchPromises = batch.map(async (student, index) => {
          const studentIndex = i + index + 1;
          const progress = Math.round((studentIndex / students.length) * 100);
          console.log(`Progress: ${progress}% - Processing student ${studentIndex}/${students.length}: Civil ID ${student.civilId}`);
          
          try {
            // Skip if folder already created
            if (student.folderCreated) {
              skipped++;
              console.log(`⏭️ Skipped Civil ID ${student.civilId} - folder already exists`);
              return;
            }
            
            // Create folder using Service Account in teacher's shared Google Drive folder
            if (teacher.driveFolderId) {
              try {
                const { googleDriveService } = await import('./googleDriveService');
                const result = await googleDriveService.createStudentFolder(teacher, student);
                
                if (result.success) {
                  await storage.updateStudent(student.id, {
                    folderCreated: true,
                    driveFolderId: result.folderId
                  });
                  created++;
                  console.log(`✅ Created folder for Civil ID: ${student.civilId} with Google Drive ID: ${result.folderId}`);
                  return;
                } else {
                  console.error(`❌ Failed to create folder for Civil ID ${student.civilId}: ${result.error}`);
                }
              } catch (error) {
                console.error(`❌ Error creating folder for Civil ID ${student.civilId}:`, error);
              }
            }
            
            // Mark as logically created if no Google Drive access
            await storage.updateStudent(student.id, {
              folderCreated: true
            });
            created++;
            console.log(`Marked folder as created for Civil ID: ${student.civilId}`);
          } catch (error) {
            failed++;
            details.push(`فشل في تسجيل مجلد للطالب برقم الهوية: ${student.civilId}`);
            console.error('Error creating folder entry:', error);
          }
        });
        
        // Wait for current batch to complete before processing next batch
        await Promise.all(batchPromises);
        
        // Small delay between batches to avoid overwhelming Google Drive API
        if (i + batchSize < students.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Generate folder structure information
      const { generateSharingInstructions } = await import('./googleDriveSimple');
      const instructions = generateSharingInstructions(teacher);

      // Prepare response details
      const responseDetails: string[] = [];
      if (created > 0) {
        responseDetails.push(`تم إنشاء ${created} مجلد جديد`);
      }
      if (skipped > 0) {
        responseDetails.push(`تم تخطي ${skipped} مجلد موجود مسبقاً`);
      }
      if (failed > 0) {
        responseDetails.push(`فشل في إنشاء ${failed} مجلد`);
        responseDetails.push(...details);
      }
      if (created === 0 && skipped > 0) {
        responseDetails.push("جميع المجلدات موجودة مسبقاً");
      }

      res.json({
        success: true,
        created,
        failed,
        skipped,
        total: students.length,
        message: `تم تجهيز ${created} مجلد للطلاب بنجاح`,
        details: responseDetails,
        instructions,
        note: "المجلدات جاهزة للاستخدام - يمكن للأهالي الوصول إليها عبر الروابط والـ QR codes"
      });

    } catch (error) {
      console.error("Error creating student folders:", error);
      res.status(500).json({ message: "Failed to create student folders" });
    }
  });

  // Student routes
  app.get("/api/teacher/:teacherId/students", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const students = await storage.getStudentsByTeacher(teacherId);
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Delete single student
  app.delete("/api/teacher/:teacherId/students/:studentId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      await storage.deleteStudent(studentId);
      res.json({ message: "تم حذف الطالب بنجاح" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Delete all students for a teacher
  app.delete("/api/teacher/:teacherId/students", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const students = await storage.getStudentsByTeacher(teacherId);
      
      for (const student of students) {
        await storage.deleteStudent(student.id);
      }
      
      res.json({ 
        message: `تم حذف ${students.length} طالب بنجاح`,
        deleted: students.length
      });
    } catch (error) {
      console.error("Error deleting all students:", error);
      res.status(500).json({ message: "Failed to delete students" });
    }
  });

  // File upload for specific student
  app.post("/api/teacher/:teacherId/students/:studentId/upload", upload.array('files', 10), async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const studentId = parseInt(req.params.studentId);
      const category = req.body.category || 'general';
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "لم يتم رفع أي ملفات" });
      }

      // Get teacher and student info
      const teacher = await storage.getTeacher(teacherId);
      const student = await storage.getStudent(studentId);
      
      if (!teacher || !student) {
        return res.status(404).json({ message: "المعلم أو الطالب غير موجود" });
      }

      // Validate that student belongs to this teacher
      if (student.teacherId !== teacherId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذا الطالب" });
      }

      const uploadedFiles = [];
      const errors = [];

      // Enforce Drive-only: require Drive configuration
      if (!teacher.driveFolderId) {
        return res.status(400).json({ message: 'الرجاء ربط Google Drive وتحديد مجلد رئيسي لحساب المعلم قبل رفع الملفات.' });
      }

      for (const file of req.files as Express.Multer.File[]) {
        try {
          let driveFileId: string | null = null;
          let driveWebViewLink: string | null = null;

          // Determine subject folder name from student's subjects (fallback to 'عام')
          let primarySubject = 'عام';
          try {
            const { uploadBufferToDrivePath } = await import('./googleDriveService');
            // Get student's subjects
            const studentSubjects = await storage.getStudentSubjects(student.id);
            primarySubject = studentSubjects.length > 0 ? (studentSubjects[0].nameAr || 'عام') : 'عام';
            
            // Build Drive folder path: CivilID / Subject / Category
            const pathParts = [
              student.civilId,
              (primarySubject && String(primarySubject).trim()) ? String(primarySubject).trim() : 'عام',
              category
            ];

            // Build complete folder path including subject and category
            const uploadPathParts = [
              student.civilId,
              primarySubject,
              category
            ].filter(Boolean);

            const { fileId, webViewLink } = await uploadBufferToDrivePath(
              teacher,
              uploadPathParts,
              file.originalname,
              file.buffer,
              file.mimetype,
              teacher.driveFolderId
            );
            driveFileId = fileId;
            driveWebViewLink = webViewLink;
            console.log(`File uploaded to Google Drive: ${file.originalname}`);
          } catch (driveError) {
            console.error('Google Drive upload error:', driveError);
            errors.push({ fileName: file.originalname, error: 'فشل رفع الملف إلى Google Drive' });
            continue;
          }

          // Save file record to database (Drive-only)
          const fileRecord = await storage.createFile({
            teacherId,
            studentCivilId: student.civilId,
            originalName: file.originalname,
            systemName: file.originalname,
            filePath: driveFileId ? `drive:${driveFileId}` : 'drive:unknown',
            fileUrl: driveWebViewLink || '',
            fileSize: file.size,
            fileType: file.mimetype,
            fileCategory: category
          });

          uploadedFiles.push({
            id: fileRecord.id,
            fileName: file.originalname,
            size: file.size,
            category,
            driveUploaded: true,
            driveFileId
          });
        } catch (error) {
          console.error('Error processing file upload:', error);
          errors.push({ fileName: (file as any).originalname, error: 'فشل رفع الملف' });
        }
      }

      if (uploadedFiles.length === 0) {
        return res.status(500).json({ 
          message: "فشل في رفع جميع الملفات",
          errors 
        });
      }

      const driveUploadedCount = uploadedFiles.filter((f: any) => f.driveUploaded).length;
      let message = `تم رفع ${uploadedFiles.length} ملف بنجاح للطالب ${student.studentName}`;
      
      if (teacher.driveFolderId) {
        if (driveUploadedCount === uploadedFiles.length) {
          message += ` وتم رفعها جميعاً إلى Google Drive`;
        } else if (driveUploadedCount > 0) {
          message += ` (${driveUploadedCount} منها تم رفعها إلى Google Drive)`;
        } else {
          message += ` (لم يتم رفعها إلى Google Drive - يرجى التحقق من الإعدادات)`;
        }
      } else {
        message += ` (لم يتم تكوين Google Drive - الملفات محفوظة محلياً فقط)`;
      }

      res.json({
        message,
        uploadedFiles,
        driveInfo: {
          configured: !!teacher.driveFolderId,
          uploadedToDrive: driveUploadedCount,
          totalFiles: uploadedFiles.length
        },
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "خطأ في رفع الملفات" });
    }
  });

  // Get files for a specific student
  app.get("/api/teacher/:teacherId/students/:studentId/files", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const studentId = parseInt(req.params.studentId);
      
      const student = await storage.getStudent(studentId);
      if (!student || student.teacherId !== teacherId) {
        return res.status(404).json({ message: "الطالب غير موجود" });
      }

      const files = await storage.getFilesByStudent(student.civilId, teacherId);
      res.json(files);

    } catch (error) {
      console.error("Error fetching student files:", error);
      res.status(500).json({ message: "خطأ في جلب ملفات الطالب" });
    }
  });

  app.post("/api/teacher/:teacherId/students/upload-excel", upload.single('file'), async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check for existing students to prevent duplicates
      const existingStudents = await storage.getStudentsByTeacher(teacherId);

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Validate and map Excel data
      const validStudentsData: any[] = [];
      let skippedRows = 0;
      let duplicateRows = 0;
      
      // Get existing civil IDs to prevent duplicates
      const existingCivilIds = new Set(existingStudents.map(s => s.civilId));
      
      for (let index = 0; index < data.length; index++) {
        const row = data[index] as Record<string, any>;
        
        // Try different column name variations - updated to match user's file
        const serialNumber = row['رقم متسلسل'] || row['Serial Number'] || row['الرقم'] || row['رقم'] || row['م'];
        const studentName = row['اسم الطالب'] || row['Student Name'] || row['الاسم'] || row['اسم'];
        const civilId = row['رقم الهوية'] || row['Civil ID'] || row['الهوية'] || row['رقم_الهوية'] || row['السجل المدني'];
        const grade = row['الصف'] || row['Grade'] || row['الصف_الدراسي'];
        const classNumber = row['رقم الفصل'] || row['Class Number'] || row['الفصل'] || row['رقم_الفصل'];
        const subject = row['المادة'] || row['Subject'] || row['المادة_الدراسية'];

        // Skip empty rows
        if (!studentName && !civilId && !grade && !classNumber && !subject) {
          skippedRows++;
          continue;
        }

        if (!studentName || !civilId || !grade || !classNumber || !subject) {
          skippedRows++;
          console.warn(`تجاهل الصف ${index + 2}: بيانات ناقصة`);
          continue;
        }

        // Convert civilId to string and validate
        const civilIdStr = String(civilId).replace(/\s/g, '');
        
        // Skip rows with invalid civil IDs instead of throwing error
        if (civilIdStr.length !== 10 || !/^\d{10}$/.test(civilIdStr)) {
          skippedRows++;
          console.warn(`تجاهل الصف ${index + 2}: رقم هوية غير صحيح "${civilIdStr}"`);
          continue;
        }

        // Check for duplicates
        if (existingCivilIds.has(civilIdStr)) {
          duplicateRows++;
          console.warn(`تجاهل الصف ${index + 2}: الطالب موجود مسبقاً (${civilIdStr})`);
          continue;
        }

        // Add to set to prevent duplicates within the same Excel file
        existingCivilIds.add(civilIdStr);

        validStudentsData.push({
          civilId: civilIdStr,
          studentName: studentName.toString().trim(),
          grade: grade.toString().trim(),
          classNumber: parseInt(classNumber.toString()),
          subject: subject.toString().trim(),
          teacherId,
          folderCreated: false,
          isActive: true
        });
      }

      // Create students in batch
      const createdStudents = await storage.createStudentsBatch(validStudentsData);
      
      // Create file folders for new students
      const teacher = await storage.getTeacher(teacherId);
      if (teacher) {
        // Ensure teacher folder structure exists
        await fileStorage.createTeacherFolders(teacherId, teacher.name);
        
        // Create local folders for each new student
        for (const student of createdStudents) {
          try {
            const studentFolderPath = path.join(fileStorage.getBaseUploadPath(), `teacher_${teacherId}`, `student_${student.civilId}`);
            await fileStorage.createStudentFolder(teacherId, student.civilId, student.studentName);
          } catch (error) {
            console.warn(`Failed to create local folder for student ${student.studentName}:`, error);
          }
        }
        
        // Create student folders during Excel upload
        for (const student of createdStudents) {
          try {
            await storage.updateStudent(student.id, {
              folderCreated: true
            });
          } catch (error) {
            console.error(`Failed to create student folder for ${student.civilId}:`, error);
          }
        }
      }
      
      res.json({ 
        message: `تم رفع ${validStudentsData.length} طالب بنجاح`,
        added: validStudentsData.length,
        skipped: skippedRows,
        duplicates: duplicateRows,
        total: data.length,
        details: `${skippedRows > 0 ? `تم تجاهل ${skippedRows} صف بسبب بيانات غير صحيحة. ` : ''}${duplicateRows > 0 ? `تم تجاهل ${duplicateRows} طالب مكرر.` : ''}`
      });
    } catch (error) {
      console.error("Error uploading Excel:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to upload Excel file" });
    }
  });

  // Test endpoint to analyze uploaded Excel file structure
  app.post("/api/test-excel", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Analyze structure
      const analysis = {
        totalRows: data.length,
        columns: data.length > 0 ? Object.keys(data[0] as any) : [],
        sampleData: data.slice(0, 3),
        fileName: req.file.originalname,
        fileSize: req.file.size
      };

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing Excel:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to analyze Excel file" });
    }
  });

  // Template download endpoint
  app.get('/api/template/students', async (req, res) => {
    try {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['رقم الهوية', 'اسم الطالب', 'الصف', 'الفصل', 'المادة (اختياري)'],
        ['1234567890', 'عمر أحمد', 'الأول', 'أ', 'الرياضيات'],
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'الطلاب');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=student_template.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ message: 'فشل إنشاء القالب' });
    }
  });

  app.post("/api/teacher/:teacherId/students", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      
      const studentSchema = z.object({
        civilId: z.string().length(10),
        studentName: z.string().min(1),
        grade: z.string().min(1),
        classNumber: z.number().int().positive(),
        subjects: z.array(z.string()).min(1)
      });

      const validatedData = studentSchema.parse(req.body);
      
      // Validate subjects belong to teacher
      const teacherSubjects = await storage.getTeacherSubjects(teacherId);
      const validSubjectIds: number[] = [];
      
      for (const subjectName of validatedData.subjects) {
        const subject = await storage.getSubjectByName(subjectName);
        if (!subject || !teacherSubjects.some(ts => ts.id === subject.id)) {
          return res.status(400).json({ message: `Invalid subject: ${subjectName}` });
        }
        validSubjectIds.push(subject.id);
      }

      const studentData = {
        civilId: validatedData.civilId,
        studentName: validatedData.studentName,
        grade: validatedData.grade,
        classNumber: validatedData.classNumber,
        teacherId,
        folderCreated: false,
        isActive: true
      };

      const student = await storage.createStudent(studentData);
      
      // Create student folder
      try {
        const studentFolderPath = path.join(fileStorage.getBaseUploadPath(), `teacher_${teacherId}`, `student_${student.civilId}`);
        await fileStorage.createStudentFolder(teacherId, student.civilId, student.studentName);
      } catch (error) {
        console.error(`Failed to create student folder for ${student.civilId}:`, error);
      }
      
      // Link student to subjects
      await storage.setStudentSubjects(student.id, validSubjectIds);

      res.json(student);
    } catch (error: any) {
      console.error("Error creating student:", error);
      
      // Handle duplicate civil ID error
      if (error.message && error.message.includes('UNIQUE constraint failed: students.civil_id')) {
        res.status(400).json({ message: "رقم الهوية مسجل مسبقاً. يرجى استخدام رقم هوية آخر." });
      } else {
        res.status(500).json({ message: "فشل إضافة الطالب" });
      }
    }
  });

  app.put("/api/student/:studentId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const studentSchema = z.object({
        civilId: z.string().length(10),
        studentName: z.string().min(1),
        grade: z.string().min(1),
        classNumber: z.number().int().positive(),
        subjects: z.array(z.string()).min(1),
        deleteRemovedSubjectFolders: z.boolean().optional()
      });

      const validatedData = studentSchema.parse(req.body);

      // Get existing student to validate teacher ownership
      const existingStudent = await storage.getStudent(studentId);
      if (!existingStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Validate subjects belong to student's teacher
      const teacherSubjects = await storage.getTeacherSubjects(existingStudent.teacherId);
      const validSubjectIds: number[] = [];
      
      for (const subjectName of validatedData.subjects) {
        const subject = await storage.getSubjectByName(subjectName);
        if (!subject || !teacherSubjects.some(ts => ts.id === subject.id)) {
          return res.status(400).json({ message: `Invalid subject: ${subjectName}` });
        }
        validSubjectIds.push(subject.id);
      }

      // Get current subjects to identify removed subjects
      const currentSubjects = await storage.getStudentSubjects(studentId);
      const currentSubjectNames = currentSubjects.map(s => s.nameAr);
      const newSubjectNames = validatedData.subjects;
      
      // Find removed subjects
      const removedSubjects = currentSubjectNames.filter(subject => !newSubjectNames.includes(subject));

      const studentData = {
        civilId: validatedData.civilId,
        studentName: validatedData.studentName,
        grade: validatedData.grade,
        classNumber: validatedData.classNumber,
      };

      const student = await storage.updateStudent(studentId, studentData);

      // Handle subject folder deletion if requested
      if (validatedData.deleteRemovedSubjectFolders && removedSubjects.length > 0 && existingStudent.folderCreated) {
        try {
          const teacher = await storage.getTeacher(existingStudent.teacherId);
          if (teacher && teacher.driveFolderId) {
            const { googleDriveService } = await import('./googleDriveService');
            
            // Delete folders for removed subjects
            for (const removedSubject of removedSubjects) {
              try {
                await googleDriveService.deleteSubjectFolder(
                  teacher, 
                  existingStudent.studentName, 
                  existingStudent.civilId, 
                  removedSubject
                );
              } catch (error) {
                console.error(`Error deleting subject folder ${removedSubject}:`, error);
                // Continue with other folders even if one fails
              }
            }
          }
        } catch (error) {
          console.error('Error deleting subject folders:', error);
        }
      }

      // Update student subjects
      await storage.setStudentSubjects(student.id, validSubjectIds);

      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  // Get student subjects
  app.get("/api/student/:studentId/subjects", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const subjects = await storage.getStudentSubjects(studentId);
      const subjectNames = subjects.map(s => s.nameAr || s.nameAr);
      
      res.json(subjectNames);
    } catch (error) {
      console.error("Error fetching student subjects:", error);
      res.status(500).json({ message: "Failed to fetch student subjects" });
    }
  });

  // Create individual student folder
  app.post("/api/student/:studentId/folder", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const teacher = await storage.getTeacher(student.teacherId);
      if (!teacher || !teacher.driveFolderId) {
        return res.status(400).json({ message: "Google Drive folder not configured" });
      }

      // Skip if folder already created
      if (student.folderCreated) {
        return res.status(400).json({ message: "مجلد الطالب موجود مسبقاً" });
      }

      // Get student's subjects for creating subject folders
      const studentSubjects = await storage.getStudentSubjects(studentId);
      
      try {
        const { googleDriveService } = await import('./googleDriveService');
        
        // Create main student folder
        const result = await googleDriveService.createStudentFolder(teacher, student);
        
        if (result.success) {
          // Create subject subfolders for all enrolled subjects
          if (studentSubjects.length > 0) {
            const { getDriveForTeacher } = await import('./googleDriveService');
            const drive = await getDriveForTeacher(teacher);
            if (drive) {
              const { ensureFolderPath } = await import('./googleDriveService');
              
              // Create subject folders inside student folder
              for (const subject of studentSubjects) {
                const subjectName = (subject as any).nameAr || 'عام';
                await ensureFolderPath(drive, [student.studentName + ' - ' + student.civilId, subjectName], teacher.driveFolderId);
              }
            }
          }
          
          await storage.updateStudent(student.id, {
            folderCreated: true,
            driveFolderId: result.folderId
          });
          
          res.json({
            success: true,
            message: `تم إنشاء مجلد الطالب ${student.studentName} بنجاح مع ${studentSubjects.length} مادة`,
            folderId: result.folderId
          });
        } else {
          throw new Error(result.error || "فشل إنشاء المجلد");
        }
      } catch (error) {
        console.error('Error creating student folder:', error);
        res.status(500).json({ 
          message: error instanceof Error ? error.message : "فشل إنشاء مجلد الطالب" 
        });
      }
    } catch (error) {
      console.error("Error creating student folder:", error);
      res.status(500).json({ message: "فشل إنشاء مجلد الطالب" });
    }
  });

  app.post("/api/teacher/:teacherId/files", upload.single('file'), async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { studentCivilId, subject, fileCategory, description } = req.body;

      if (!studentCivilId || !subject || !fileCategory) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Require Drive configuration
      const teacher = await storage.getTeacher(teacherId);
      if (!teacher || !teacher.driveFolderId) {
        return res.status(400).json({ message: 'الرجاء ربط Google Drive وتحديد مجلد رئيسي لحساب المعلم قبل رفع الملفات.' });
      }

      // Build Drive folder path and upload
      const { uploadBufferToDrivePath } = await import('./googleDriveService');
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileExtension = req.file.originalname.split('.').pop();
      const systemName = `${studentCivilId}_${subject}_${fileCategory}_${date}_${Date.now()}.${fileExtension}`;

      const pathParts = [
        studentCivilId,
        (subject && String(subject).trim()) ? String(subject).trim() : 'عام',
        fileCategory
      ];

      const { fileId, webViewLink } = await uploadBufferToDrivePath(
        teacher,
        pathParts,
        req.file.originalname,
        req.file.buffer,
        req.file.mimetype,
        teacher.driveFolderId
      );

      const fileData = {
        studentCivilId,
        subject,
        fileCategory,
        originalName: req.file.originalname,
        systemName,
        filePath: `drive:${fileId}`,
        fileUrl: webViewLink || '',
        fileSize: req.file.size,
        fileType: fileExtension || 'unknown',
        teacherId,
        description: description || null,
        isActive: true
      };

      const file = await storage.createFile(fileData);
      res.json(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // File serving endpoint
  app.get("/api/files/*", (req: any, res) => {
    try {
      const relativePath = req.params[0] || '';
      const absolutePath = fileStorage.getAbsolutePath(relativePath);
      
      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      // Set appropriate headers
      const ext = path.extname(absolutePath).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.txt': 'text/plain'
      };

      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      
      // Send file
      res.sendFile(absolutePath);
    } catch (error) {
      console.error("Error serving file:", error);
    }
  });

  // Teacher Google authentication routes
  app.post('/api/auth/google/register', async (req, res) => {
    try {
      const { name, googleId, email, profileImageUrl, accessToken } = req.body;
      
      // Check if teacher already exists
      let teacher = await storage.getTeacherByGoogleId(googleId);
      
      if (!teacher) {
        // Create new teacher with Google Auth integration
        const linkCode = `${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
        teacher = await storage.createTeacher({
          name,
          email,
          googleId,
          profileImageUrl,
          linkCode,
          accessToken: accessToken || '',
          refreshToken: '',
          isActive: true
        });
      } else {
        // Update existing teacher with new access token
        teacher = await storage.updateTeacher(teacher.id, {
          accessToken: accessToken || teacher.accessToken,
          lastLogin: new Date()
        });
      }
      
      res.json(teacher);
    } catch (error) {
      console.error('Error registering teacher:', error);
      res.status(500).json({ message: 'Failed to register teacher' });
    }
  });

  // Update teacher's Google Drive folder
  app.put('/api/teacher/:teacherId/drive-folder', async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const { driveFolderId } = req.body;
      
      const teacher = await storage.updateTeacher(teacherId, {
        driveFolderId
      });
      
      res.json(teacher);
    } catch (error) {
      console.error('Error updating Drive folder:', error);
      res.status(500).json({ message: 'Failed to update Drive folder' });
    }
  });

  // Parent access routes
  app.get("/api/captcha", async (req, res) => {
    try {
      const captcha = await storage.getRandomCaptcha();
      
      if (!captcha) {
        return res.status(404).json({ message: "No captcha questions available" });
      }

      res.json({
        id: captcha.id,
        question: captcha.question
      });
    } catch (error) {
      console.error("Error fetching captcha:", error);
      res.status(500).json({ message: "Failed to fetch captcha" });
    }
  });

  app.post("/api/verify-access-simple", async (req, res) => {
    try {
      const { civilId, linkCode } = req.body;

      if (!civilId || !linkCode) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify teacher link
      const teacher = await storage.getTeacherByLinkCode(linkCode);
      if (!teacher) {
        return res.status(404).json({ message: "Invalid access link" });
      }

      // Check if student exists for this teacher
      const student = await storage.getStudentByCivilId(civilId);
      if (!student || student.teacherId !== teacher.id) {
        return res.status(404).json({ message: "الطالب غير موجود في هذا الفصل" });
      }

      // Generate Google Drive URL
      let driveUrl = '';
      if (teacher.driveFolderId) {
        driveUrl = `https://drive.google.com/drive/folders/${teacher.driveFolderId}`;
      }

      res.json({
        success: true,
        studentName: student.studentName,
        teacherName: teacher.name,
        driveUrl,
        message: `مرحباً بك، يمكنك الوصول لملفات ${student.studentName}`
      });
    } catch (error) {
      console.error("Error in simple verification:", error);
      res.status(500).json({ message: "Failed to verify access" });
    }
  });

  app.post("/api/verify-student", async (req, res) => {
    try {
      const { civilId, captchaId, captchaAnswer, linkCode } = req.body;

      if (!civilId || !captchaAnswer || !linkCode) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify teacher link
      const teacher = await storage.getTeacherByLinkCode(linkCode);
      if (!teacher) {
        return res.status(404).json({ message: "Invalid access link" });
      }

      // Simple captcha verification - just check if answer is a number
      // The frontend generates simple math problems, so we skip DB verification
      if (isNaN(parseInt(captchaAnswer))) {
        return res.status(400).json({ message: "Invalid captcha answer" });
      }

      // Find student
      const student = await storage.getStudentByCivilId(civilId);
      if (!student || student.teacherId !== teacher.id) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Get student files grouped by subject and category
      const studentFiles = await storage.getFilesByStudentWithSubjects(civilId, teacher.id);
      
      // Group files by subject and category
      const filesBySubject = studentFiles.reduce((acc: any, file) => {
        if (!acc[file.subjectName]) {
          acc[file.subjectName] = {};
        }
        if (!acc[file.subjectName][file.fileCategory]) {
          acc[file.subjectName][file.fileCategory] = [];
        }
        acc[file.subjectName][file.fileCategory].push(file);
        return acc;
      }, {});

      // Generate Google Drive folder structure for this student
      const { generateStudentFolderStructure } = await import('./googleDriveSimple');
      const driveInfo = generateStudentFolderStructure(teacher, student);

      res.json({
        student: {
          name: student.studentName,
          civilId: student.civilId,
          grade: student.grade,
          classNumber: student.classNumber
        },
        teacher: {
          name: teacher.name,
          driveFolderId: teacher.driveFolderId
        },
        files: filesBySubject,
        driveInfo
      });
    } catch (error) {
      console.error("Error verifying student:", error);
      res.status(500).json({ message: "Failed to verify student" });
    }
  });

  // Delete single student
  app.delete("/api/teacher/:teacherId/students/:studentId", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const deleteFiles = req.query.deleteFiles === 'true';
      
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Delete files from Google Drive if requested
      if (deleteFiles && student.folderCreated) {
        try {
          const teacher = await storage.getTeacher(student.teacherId);
          if (teacher && teacher.driveFolderId) {
            const { googleDriveService } = await import('./googleDriveService');
            
            // Get student's subjects to identify folder structure
            const studentSubjects = await storage.getStudentSubjects(studentId);
            
            // Delete student folder and all contents
            const folderName = `${student.studentName} - ${student.civilId}`;
            await googleDriveService.deleteStudentFolder(teacher, folderName);
          }
        } catch (error) {
          console.error('Error deleting student files from Drive:', error);
          // Continue with database deletion even if file deletion fails
        }
      }

      await storage.deleteStudent(studentId);
      res.json({ 
        message: deleteFiles 
          ? "تم حذف الطالب والملفات بنجاح" 
          : "تم حذف الطالب مع الاحتفاظ بالملفات"
      });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ message: "فشل حذف الطالب" });
    }
  });

  // Delete multiple students
  app.delete("/api/teacher/:teacherId/students", async (req, res) => {
    try {
      const { studentIds } = req.body;
      const deleteFiles = req.query.deleteFiles === 'true';
      
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ message: "Student IDs array is required" });
      }

      let deletedCount = 0;
      let failedCount = 0;
      let filesDeletedCount = 0;

      for (const studentId of studentIds) {
        try {
          const student = await storage.getStudent(parseInt(studentId));
          if (student && deleteFiles && student.folderCreated) {
            try {
              const teacher = await storage.getTeacher(student.teacherId);
              if (teacher && teacher.driveFolderId) {
                const { googleDriveService } = await import('./googleDriveService');
                const folderName = `${student.studentName} - ${student.civilId}`;
                await googleDriveService.deleteStudentFolder(teacher, folderName);
                filesDeletedCount++;
              }
            } catch (error) {
              console.error(`Error deleting files for student ${studentId}:`, error);
              // Continue with database deletion even if file deletion fails
            }
          }
          
          await storage.deleteStudent(parseInt(studentId));
          deletedCount++;
        } catch (error) {
          failedCount++;
          console.error(`Error deleting student ${studentId}:`, error);
        }
      }

      res.json({ 
        message: deleteFiles 
          ? `تم حذف ${deletedCount} طالب و${filesDeletedCount} من الملفات بنجاح`
          : `تم حذف ${deletedCount} طالب مع الاحتفاظ بالملفات`,
        deletedCount,
        failedCount,
        filesDeletedCount,
        total: studentIds.length
      });
    } catch (error) {
      console.error("Error deleting students:", error);
      res.status(500).json({ message: "فشل حذف الطلاب" });
    }
  });

  // Delete all students for a teacher
  app.delete("/api/teacher/:teacherId/students/all", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      const deleteFiles = req.query.deleteFiles === 'true';
      
      const students = await storage.getStudentsByTeacher(teacherId);
      
      let deletedCount = 0;
      let failedCount = 0;
      let filesDeletedCount = 0;

      for (const student of students) {
        try {
          // Delete files from Google Drive if requested
          if (deleteFiles && student.folderCreated) {
            try {
              const teacher = await storage.getTeacher(student.teacherId);
              if (teacher && teacher.driveFolderId) {
                const { googleDriveService } = await import('./googleDriveService');
                const folderName = `${student.studentName} - ${student.civilId}`;
                await googleDriveService.deleteStudentFolder(teacher, folderName);
                filesDeletedCount++;
              }
            } catch (error) {
              console.error(`Error deleting files for student ${student.id}:`, error);
              // Continue with database deletion even if file deletion fails
            }
          }
          
          await storage.deleteStudent(student.id);
          deletedCount++;
        } catch (error) {
          failedCount++;
          console.error(`Error deleting student ${student.id}:`, error);
        }
      }

      res.json({ 
        message: deleteFiles 
          ? `تم حذف ${deletedCount} طالب و${filesDeletedCount} من الملفات بنجاح`
          : `تم حذف ${deletedCount} طالب مع الاحتفاظ بالملفات`,
        deletedCount,
        failedCount,
        filesDeletedCount,
        total: students.length
      });
    } catch (error) {
      console.error("Error deleting all students:", error);
      res.status(500).json({ message: "فشل حذف جميع الطلاب" });
    }
  });

  // Teacher subjects endpoint
  app.get('/api/teacher/:teacherId/subjects', async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      
      if (isNaN(teacherId)) {
        return res.status(400).json({ message: "Invalid teacher ID" });
      }
      
      const subjects = await storage.getTeacherSubjects(teacherId);
      res.json(subjects);
    } catch (error) {
      console.error('Error fetching teacher subjects:', error);
      res.status(500).json({ message: 'Failed to fetch teacher subjects' });
    }
  });

  app.post("/api/teacher/:teacherId/students/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم تحميل أي ملف" });
      }
      
      const teacherId = parseInt(req.params.teacherId);
      if (isNaN(teacherId)) {
        return res.status(400).json({ message: "معرف المعلم غير صالح" });
      }
      
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Skip header row
      const rows = data.slice(1);
      
      const teacherSubjects = await storage.getTeacherSubjects(teacherId);
      const subjectNames = teacherSubjects.map(s => s.nameAr);
      
      const added = [];
      const skipped = [];
      const errors = [];
      
      // Track civil IDs in this upload to detect duplicates within the file
      const civilIdSet = new Set<string>();
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 4) {
          skipped.push({ row: i+2, reason: "صف فارغ أو غير مكتمل" });
          continue;
        }
        
        const civilId = String(row[0]).trim();
        const studentName = String(row[1]).trim();
        const grade = String(row[2]).trim();
        const classNumber = String(row[3]).trim();
        let subjectsInput = row[4] ? String(row[4]).trim() : '';
        
        // Validate civil ID
        if (!/^\d{10}$/.test(civilId)) {
          skipped.push({ row: i+2, reason: "رقم الهوية غير صالح (يجب 10 أرقام)" });
          continue;
        }
        
        // Check duplicate civil ID in this upload
        if (civilIdSet.has(civilId)) {
          skipped.push({ row: i+2, reason: "رقم الهوية مكرر في الملف" });
          continue;
        }
        civilIdSet.add(civilId);
        
        // Check if student already exists
        const existingStudent = await storage.getStudentByCivilId(civilId);
        if (existingStudent) {
          skipped.push({ row: i+2, reason: "رقم الهوية مسجل مسبقاً" });
          continue;
        }
        
        // Parse subjects (comma-separated)
        const subjectNamesInRow = subjectsInput.split(',').map(s => s.trim()).filter(s => s);
        const validSubjectIds: number[] = [];
        
        // Validate subjects
        for (const subName of subjectNamesInRow) {
          const subject = teacherSubjects.find(s => s.nameAr === subName);
          if (subject) {
            validSubjectIds.push(subject.id);
          } else {
            skipped.push({ row: i+2, reason: `المادة '${subName}' غير موجودة` });
            validSubjectIds.length = 0; // Clear valid subjects
            break;
          }
        }
        
        if (validSubjectIds.length === 0 && subjectNamesInRow.length > 0) {
          // If there were subjects but none valid, skip
          continue;
        }
        
        // Create student
        try {
          const student = await storage.createStudent({
            civilId,
            studentName,
            grade,
            classNumber,
            teacherId
          });
          
          if (validSubjectIds.length > 0) {
            await storage.setStudentSubjects(student.id, validSubjectIds);
          }
          
          // Create student folder
          try {
            const studentFolderPath = path.join(fileStorage.getBaseUploadPath(), `teacher_${teacherId}`, `student_${student.civilId}`);
            await fileStorage.createStudentFolder(teacherId, student.civilId, student.studentName);
          } catch (error) {
            console.error(`Failed to create student folder for ${student.civilId}:`, error);
          }
          
          // Create student folder during Excel upload
          try {
            await storage.updateStudent(student.id, {
              folderCreated: true
            });
          } catch (error) {
            console.error(`Failed to create student folder for ${student.civilId}:`, error);
          }
          
          added.push(student);
        } catch (error) {
          console.error(`Error creating student from row ${i+2}:`, error);
          skipped.push({ row: i+2, reason: "خطأ في إنشاء الطالب" });
        }
      }
      
      res.json({ 
        message: `تمت إضافة ${added.length} طالب بنجاح`,
        added: added.length,
        skipped: skipped.length,
        skippedDetails: skipped
      });
      
    } catch (error) {
      console.error("Error uploading students:", error);
      res.status(500).json({ message: "فشل رفع الملف" });
    }
  });

  // Repair folders for all students of a teacher
  app.post("/api/teacher/:teacherId/folders/repair", async (req, res) => {
    try {
      const teacherId = parseInt(req.params.teacherId);
      if (isNaN(teacherId)) {
        return res.status(400).json({ message: "Invalid teacher ID" });
      }
      
      const students = await storage.getStudentsByTeacher(teacherId);
      
      let created = 0;
      let errors = 0;
      
      for (const student of students) {
        try {
          // Check if folder exists
          const studentFolderPath = path.join(fileStorage.getBaseUploadPath(), `teacher_${teacherId}`, `student_${student.civilId}`);
          if (!fs.existsSync(studentFolderPath)) {
            await fileStorage.createStudentFolder(teacherId, student.civilId, student.studentName);
            created++;
          }
        } catch (error) {
          errors++;
          console.error(`Failed to repair folder for student ${student.civilId}:`, error);
        }
      }
      
      res.json({ 
        message: `تم إنشاء ${created} مجلد${created === 1 ? '' : 'ات'} طالب${errors > 0 ? ` مع ${errors} خطأ` : ''}`
      });
      
    } catch (error) {
      console.error("Error repairing folders:", error);
      res.status(500).json({ message: "فشل إصلاح المجلدات" });
    }
  });
  
  // Create folder for a specific student
  app.post("/api/student/:studentId/folder", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "الطالب غير موجود" });
      }
      
      // Check if folder exists
      const studentFolderPath = path.join(fileStorage.getBaseUploadPath(), `teacher_${student.teacherId}`, `student_${student.civilId}`);
      if (fs.existsSync(studentFolderPath)) {
        return res.json({ message: "المجلد موجود بالفعل" });
      }
      
      await fileStorage.createStudentFolder(student.teacherId, student.civilId, student.studentName);
      
      res.json({ message: "تم إنشاء مجلد الطالب بنجاح" });
      
    } catch (error) {
      console.error("Error creating student folder:", error);
      res.status(500).json({ message: "فشل إنشاء المجلد" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function initializeCaptchaQuestions() {
  try {
    // Check if captcha questions already exist
    const existingCaptcha = await storage.getRandomCaptcha();
    if (existingCaptcha) {
      return; // Already initialized
    }

    // Initialize default captcha questions
    const defaultQuestions = [
      { question: "كم يساوي: 2 + 3 = ؟", answer: "5" },
      { question: "كم يساوي: 7 - 2 = ؟", answer: "5" },
      { question: "كم يساوي: 3 × 2 = ؟", answer: "6" },
      { question: "كم يساوي: 8 ÷ 2 = ؟", answer: "4" },
      { question: "كم عدد أيام الأسبوع؟", answer: "7" },
      { question: "كم عدد حروف كلمة 'طالب'؟", answer: "4" },
      { question: "كم يساوي: 10 - 5 = ؟", answer: "5" },
      { question: "كم يساوي: 4 + 1 = ؟", answer: "5" }
    ];

    for (const q of defaultQuestions) {
      await storage.createCaptcha({ question: q.question, answer: q.answer, isActive: true });
    }

    console.log("Captcha questions initialized successfully");
  } catch (error) {
    console.error("Error initializing captcha questions:", error);
  }
}
