import {
  teachers,
  students,
  files,
  captchaQuestions,
  teacherSubjects,
  studentSubjects,
  subjects,
  type Teacher,
  type InsertTeacher,
  type Student,
  type InsertStudent,
  type File,
  type InsertFile,
  type CaptchaQuestion,
  type InsertCaptchaQuestion,
  type Subject,
  type InsertSubject
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Teacher operations
  getTeacher(id: number): Promise<Teacher | undefined>;
  getTeacherByGoogleId(googleId: string): Promise<Teacher | undefined>;
  getTeacherByLinkCode(linkCode: string): Promise<Teacher | undefined>;
  getTeacherByEmail(email: string): Promise<Teacher | undefined>;
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  updateTeacher(id: number, updates: Partial<InsertTeacher & { lastLogin?: Date | string, linkCode?: string }>): Promise<Teacher>;
  validateTeacherPassword(email: string, password: string): Promise<Teacher | null>;
  setTeacherPassword(teacherId: number, passwordHash: string): Promise<void>;
  updateTeacherOnboarding(teacherId: number, schoolName: string, subjectNames: string[]): Promise<Teacher>;

  // Student operations
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByCivilId(civilId: string): Promise<Student | undefined>;
  getStudentsByTeacher(teacherId: number): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  createStudentsBatch(students: InsertStudent[]): Promise<Student[]>;
  updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: number): Promise<void>;

  // File operations
  getFile(id: number): Promise<File | undefined>;
  getFilesByStudent(studentCivilId: string, teacherId: number): Promise<File[]>;
  getFilesByStudentAndSubject(studentCivilId: string, subject: string, teacherId: number): Promise<File[]>;
  getFilesByCategory(studentCivilId: string, category: string, teacherId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<File>;
  deleteFile(id: number): Promise<void>;

  // Captcha operations
  getRandomCaptcha(): Promise<CaptchaQuestion | undefined>;
  createCaptcha(captcha: InsertCaptchaQuestion): Promise<CaptchaQuestion>;

  // Subject operations
  getAllSubjects(): Promise<Subject[]>;
  getSubjectByName(name: string): Promise<Subject | undefined>;
  createSubject(name: string): Promise<Subject>;
  getTeacherSubjects(teacherId: number): Promise<Subject[]>;
  setTeacherSubjects(teacherId: number, subjectIds: number[]): Promise<void>;

  // Stats operations
  getTeacherStats(teacherId: number): Promise<{
    totalStudents: number;
    totalFiles: number;
    subjects: string[];
    activeParents: number;
  }>;
  getStudentFileCounts(teacherId: number): Promise<{ studentId: number; fileCount: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // Teacher operations
  async getTeacher(id: number): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id));
    return teacher || undefined;
  }

  async getTeacherByGoogleId(googleId: string): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.googleId, googleId));
    return teacher || undefined;
  }

  async getTeacherByLinkCode(linkCode: string): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.linkCode, linkCode));
    return teacher || undefined;
  }

  async getTeacherByEmail(email: string): Promise<Teacher | undefined> {
    // Get the most recent teacher with a password hash first, fallback to any teacher
    const [teacherWithPassword] = await db
      .select()
      .from(teachers)
      .where(and(
        eq(teachers.email, email),
        sql`password_hash IS NOT NULL`
      ))
      .orderBy(desc(teachers.createdAt))
      .limit(1);
    
    if (teacherWithPassword) {
      return teacherWithPassword;
    }
    
    // Fallback to any teacher with this email
    const [teacher] = await db.select().from(teachers).where(eq(teachers.email, email));
    return teacher || undefined;
  }

  async createTeacher(teacherData: InsertTeacher): Promise<Teacher> {
    const [teacher] = await db
      .insert(teachers)
      .values(teacherData)
      .returning();
    return teacher;
  }

  async updateTeacher(id: number, updates: Partial<InsertTeacher & { lastLogin?: Date | string, linkCode?: string }>): Promise<Teacher> {
    // Ensure SQLite-compatible types: convert Date to ISO string
    const toSet: Partial<InsertTeacher & { lastLogin?: string, linkCode?: string }> = { ...updates } as any;
    if (updates && updates.lastLogin instanceof Date) {
      toSet.lastLogin = updates.lastLogin.toISOString();
    }

    const [teacher] = await db
      .update(teachers)
      .set(toSet)
      .where(eq(teachers.id, id))
      .returning();
    return teacher;
  }

  async validateTeacherPassword(email: string, password: string): Promise<Teacher | null> {
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(and(
        eq(teachers.email, email),
        sql`password_hash IS NOT NULL`
      ))
      .orderBy(desc(teachers.createdAt))
      .limit(1);
    
    if (!teacher || !teacher.passwordHash) {
      return null;
    }

    const isValid = await bcrypt.compare(password, teacher.passwordHash);
    return isValid ? teacher : null;
  }

  async setTeacherPassword(teacherId: number, passwordHash: string): Promise<void> {
    await db
      .update(teachers)
      .set({ passwordHash })
      .where(eq(teachers.id, teacherId));
  }

  async updateTeacherOnboarding(teacherId: number, schoolName: string, subjectNames: string[]): Promise<Teacher> {
    // Using a transaction is problematic with better-sqlite3's async nature here.
    // We will perform these as separate steps. For this use case, it's acceptable.

    // 1. Update school name and set profile completion
    const updates: any = {
      schoolName: schoolName.trim(),
      profileComplete: 1, // SQLite boolean
      lastLogin: new Date().toISOString()
    };

    // 2. Generate teacher_code if not exists
    const teacher = await this.getTeacher(teacherId);
    if (teacher && !teacher.teacherCode) {
      const teacherCode = `TCH${String(teacherId).padStart(4, '0')}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      updates.teacherCode = teacherCode;
    }

    await db.update(teachers)
      .set(updates)
      .where(eq(teachers.id, teacherId));

    // 3. Handle subjects: find existing or create new ones
    const subjectIds = [];
    for (const name of subjectNames) {
      let subject = await this.getSubjectByName(name);
      if (!subject) {
        subject = await this.createSubject(name);
      }
      subjectIds.push(subject.id);
    }

    // 4. Set teacher subjects (delete old, insert new)
    await this.setTeacherSubjects(teacherId, subjectIds);

    // Return the updated teacher
    const updatedTeacher = await this.getTeacher(teacherId);
    if (!updatedTeacher) {
      throw new Error('Teacher not found after update');
    }
    return updatedTeacher;
  }

  // Student operations
  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async getStudentByCivilId(civilId: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.civilId, civilId));
    return student || undefined;
  }

  async getStudentsByTeacher(teacherId: number): Promise<Student[]> {
    return await db
      .select()
      .from(students)
      .where(and(eq(students.teacherId, teacherId), eq(students.isActive, true)))
      .orderBy(students.studentName);
  }

  async createStudent(studentData: InsertStudent): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values(studentData)
      .returning();
    return student;
  }

  async createStudentsBatch(studentsData: InsertStudent[]): Promise<Student[]> {
    return await db
      .insert(students)
      .values(studentsData)
      .returning();
  }

  async updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student> {
    const [student] = await db
      .update(students)
      .set(updates)
      .where(eq(students.id, id))
      .returning();
    return student;
  }

  async deleteStudent(id: number): Promise<void> {
    await db
      .update(students)
      .set({ isActive: false })
      .where(eq(students.id, id));
  }

  // File operations
  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file || undefined;
  }

  async getFilesByStudent(studentCivilId: string, teacherId: number): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(and(
        eq(files.studentCivilId, studentCivilId),
        eq(files.teacherId, teacherId),
        eq(files.isActive, true)
      ))
      .orderBy(desc(files.uploadDate));
  }

  async getFilesByStudentAndSubject(studentCivilId: string, subjectName: string, teacherId: number): Promise<File[]> {
    // Find the subject by name first
    const [subject] = await db.select().from(subjects).where(eq(subjects.nameAr, subjectName));
    if (!subject) {
      return []; // Return empty array if subject not found
    }

    // Get files by joining with studentSubjects
    const result = await db
      .select({ file: files })
      .from(files)
      .innerJoin(studentSubjects, eq(files.studentCivilId, studentSubjects.studentId))
      .where(and(
        eq(files.studentCivilId, studentCivilId),
        eq(studentSubjects.subjectId, subject.id),
        eq(files.teacherId, teacherId),
        eq(files.isActive, true)
      ))
      .orderBy(desc(files.uploadDate));
    
    // Extract the file objects from the result
    return result.map(row => row.file);
  }

  async getFilesByStudentWithSubjects(studentCivilId: string, teacherId: number): Promise<(File & { subjectName: string })[]> {
    // Get files with their subject information by joining with studentSubjects and subjects
    const result = await db
      .select({
        file: files,
        subjectName: subjects.nameAr
      })
      .from(files)
      .innerJoin(studentSubjects, eq(files.studentCivilId, studentSubjects.studentId))
      .innerJoin(subjects, eq(studentSubjects.subjectId, subjects.id))
      .where(and(
        eq(files.studentCivilId, studentCivilId),
        eq(files.teacherId, teacherId),
        eq(files.isActive, true)
      ))
      .orderBy(desc(files.uploadDate));
    
    // Extract the file objects with subject names from the result
    return result.map(row => ({
      ...row.file,
      subjectName: row.subjectName
    }));
  }

  async getFilesByCategory(studentCivilId: string, category: string, teacherId: number): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(and(
        eq(files.studentCivilId, studentCivilId),
        eq(files.fileCategory, category),
        eq(files.teacherId, teacherId),
        eq(files.isActive, true)
      ))
      .orderBy(desc(files.uploadDate));
  }

  async createFile(fileData: InsertFile): Promise<File> {
    const [file] = await db
      .insert(files)
      .values(fileData)
      .returning();
    return file;
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<File> {
    const [file] = await db
      .update(files)
      .set(updates)
      .where(eq(files.id, id))
      .returning();
    return file;
  }

  async deleteFile(id: number): Promise<void> {
    await db
      .update(files)
      .set({ isActive: false })
      .where(eq(files.id, id));
  }

  // Captcha operations
  async getRandomCaptcha(): Promise<CaptchaQuestion | undefined> {
    const [captcha] = await db
      .select()
      .from(captchaQuestions)
      .where(eq(captchaQuestions.isActive, true))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    return captcha || undefined;
  }

  async createCaptcha(captcha: InsertCaptchaQuestion): Promise<CaptchaQuestion> {
    const [newCaptcha] = await db
      .insert(captchaQuestions)
      .values(captcha)
      .returning();
    return newCaptcha;
  }

  // Subject operations
  async getAllSubjects(): Promise<Subject[]> {
    return db.select().from(subjects).execute();
  }

  async getSubjectByName(name: string): Promise<Subject | undefined> {
    const result = await db.select().from(subjects).where(eq(subjects.nameAr, name)).execute();
    return result[0];
  }

  async createSubject(nameAr: string): Promise<Subject> {
    const results = await db
      .insert(subjects)
      .values({ nameAr })
      .returning();
    return results[0];
  }

  async getTeacherSubjects(teacherId: number): Promise<Subject[]> {
    const result = await db.select()
      .from(teacherSubjects)
      .innerJoin(subjects, eq(teacherSubjects.subjectId, subjects.id))
      .where(eq(teacherSubjects.teacherId, teacherId))
      .execute();
    return result.map(row => row.subjects);
  }

  async getStudentSubjects(studentId: number): Promise<Subject[]> {
    const result = await db.select()
      .from(studentSubjects)
      .innerJoin(subjects, eq(studentSubjects.subjectId, subjects.id))
      .where(eq(studentSubjects.studentId, studentId))
      .execute();
    return result.map(row => row.subjects);
  }

  async setTeacherSubjects(teacherId: number, subjectIds: number[]): Promise<void> {
    // Bypassing the ORM for the delete operation due to a persistent error where
    // it incorrectly references a non-existent 'subjects_old' table.
    // Using a raw SQL query provides a direct and reliable workaround.
    await db.run(sql`DELETE FROM teacher_subjects WHERE teacher_id = ${teacherId}`);

    if (subjectIds.length > 0) {
      await db.insert(teacherSubjects).values(
        subjectIds.map(subjectId => ({ teacherId, subjectId }))
      ).execute();
    }
  }

  async setStudentSubjects(studentId: number, subjectIds: number[]): Promise<void> {
    await db.delete(studentSubjects).where(eq(studentSubjects.studentId, studentId)).execute();
    if (subjectIds.length > 0) {
      await db.insert(studentSubjects).values(
        subjectIds.map(subjectId => ({ studentId, subjectId }))
      ).execute();
    }
  }

  async getStudentSubjects(studentId: number): Promise<Subject[]> {
    const result = await db.select()
      .from(studentSubjects)
      .innerJoin(subjects, eq(studentSubjects.subjectId, subjects.id))
      .where(eq(studentSubjects.studentId, studentId))
      .execute();
    return result.map(row => row.subjects);
  }

  // Stats operations
  async getTeacherStats(teacherId: number): Promise<{
    totalStudents: number;
    totalFiles: number;
    subjects: string[];
    activeParents: number;
  }> {
    // Get total students
    const [studentsCount] = await db
      .select({ count: count() })
      .from(students)
      .where(and(eq(students.teacherId, teacherId), eq(students.isActive, true)));

    // Get total files
    const [filesCount] = await db
      .select({ count: count() })
      .from(files)
      .where(and(eq(files.teacherId, teacherId), eq(files.isActive, true)));

    // Get unique subjects from teacher's subjects
    const teacherSubjects = await this.getTeacherSubjects(teacherId);
    const subjects = teacherSubjects.map(s => s.nameAr);

    return {
      totalStudents: studentsCount.count,
      totalFiles: filesCount.count,
      subjects: subjects,
      activeParents: studentsCount.count // For now, assume all parents are active
    };
  }

  async getStudentFileCounts(teacherId: number): Promise<{ studentId: number; fileCount: number }[]> {
    const result = await db.select({
      studentId: students.id,
      fileCount: sql<number>`cast(count(${files.id}) as int)`
    })
    .from(students)
    .leftJoin(files, and(
      eq(files.studentCivilId, students.civilId),
      eq(files.isActive, true)
    ))
    .where(and(eq(students.teacherId, teacherId), eq(students.isActive, true)))
    .groupBy(students.id);
    
    return result;
  }
}

export const storage = new DatabaseStorage();
