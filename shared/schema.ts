import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Teachers table
export const teachers = sqliteTable("teachers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  googleId: text("google_id").unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  schoolName: text("school_name"),
  profileImageUrl: text("profile_image_url"),
  driveFolderId: text("drive_folder_id"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  linkCode: text("link_code").unique(),
  teacherCode: text("teacher_code").unique(),
  passwordHash: text("password_hash"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  lastLogin: text("last_login"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  profileComplete: integer("profile_complete", { mode: "boolean" }).default(false)
}, (table) => [
  index("idx_teachers_google_id").on(table.googleId),
  index("idx_teachers_link_code").on(table.linkCode)
]);

// Students table
export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  civilId: text("civil_id").notNull(),
  studentName: text("student_name").notNull(),
  grade: text("grade").notNull(),
  classNumber: integer("class_number").notNull(),
  academicYear: text("academic_year").notNull().default("2024-2025"),
  teacherId: integer("teacher_id").notNull(),
  folderCreated: integer("folder_created", { mode: "boolean" }).default(false),
  driveFolderId: text("drive_folder_id"),
  createdDate: text("created_date").default(sql`CURRENT_TIMESTAMP`),
  isActive: integer("is_active", { mode: "boolean" }).default(true)
}, (table) => [
  index("idx_students_civil_id").on(table.civilId),
  index("idx_students_teacher_id").on(table.teacherId)
]);

// Files table
export const files = sqliteTable("files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentCivilId: text("student_civil_id").notNull(),
  // subject: text("subject").notNull(), // Obsolete column, replaced by many-to-many relationship
  fileCategory: text("file_category").notNull(),
  originalName: text("original_name").notNull(),
  systemName: text("system_name").notNull(),
  filePath: text("file_path").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  fileType: text("file_type"),
  uploadDate: text("upload_date").default(sql`CURRENT_TIMESTAMP`),
  teacherId: integer("teacher_id").notNull(),
  description: text("description"),
  viewCount: integer("view_count").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true)
}, (table) => [
  // index("idx_files_student_subject").on(table.studentCivilId, table.subject), // Obsolete index
  index("idx_files_category").on(table.studentCivilId, table.fileCategory),
  index("idx_files_upload_date").on(table.uploadDate),
  // index("idx_files_full_search").on(table.studentCivilId, table.subject, table.fileCategory, table.uploadDate), // Obsolete index
  index("idx_files_teacher_id").on(table.teacherId)
]);

// Captcha questions table
export const captchaQuestions = sqliteTable("captcha_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true)
});

// Subjects table
export const subjects = sqliteTable('subjects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nameAr: text('name_ar').notNull(), // Arabic name
});

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;

// Teacher subjects (many-to-many)
export const teacherSubjects = sqliteTable('teacher_subjects', {
  teacherId: integer('teacher_id').references(() => teachers.id),
  subjectId: integer('subject_id').references(() => subjects.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.teacherId, table.subjectId] }),
}));

// Student subjects (many-to-many)
export const studentSubjects = sqliteTable('student_subjects', {
  studentId: integer('student_id').references(() => students.id),
  subjectId: integer('subject_id').references(() => subjects.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.studentId, table.subjectId] }),
}));

// Relations
export const teachersRelations = relations(teachers, ({ many }) => ({
  students: many(students),
  files: many(files),
  subjects: many(teacherSubjects),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  teacher: one(teachers, {
    fields: [students.teacherId],
    references: [teachers.id]
  }),
  files: many(files),
  subjects: many(studentSubjects),
}));

export const filesRelations = relations(files, ({ one }) => ({
  teacher: one(teachers, {
    fields: [files.teacherId],
    references: [teachers.id]
  }),
  student: one(students, {
    fields: [files.studentCivilId],
    references: [students.civilId]
  })
}));

// Insert schemas
export const insertTeacherSchema = createInsertSchema(teachers).omit({
  id: true,
  createdAt: true,
  lastLogin: true
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdDate: true
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadDate: true,
  viewCount: true
});

export const insertCaptchaSchema = createInsertSchema(captchaQuestions).omit({
  id: true
});

// Types
export type Teacher = typeof teachers.$inferSelect;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type CaptchaQuestion = typeof captchaQuestions.$inferSelect;
export type InsertCaptchaQuestion = z.infer<typeof insertCaptchaSchema>;

// File categories enum
export const FILE_CATEGORIES = {
  EXAMS: "اختبارات",
  GRADES: "درجات", 
  HOMEWORK: "واجبات",
  NOTES: "ملاحظات",
  ALERTS: "إنذارات",
  PARTICIPATION: "مشاركات",
  CERTIFICATES: "شهادات",
  ATTENDANCE: "حضور وغياب",
  BEHAVIOR: "سلوك",
  OTHER: "أخرى"
} as const;

export type FileCategory = typeof FILE_CATEGORIES[keyof typeof FILE_CATEGORIES];
