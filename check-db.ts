import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, 'data', 'app.db');
const db = new Database(dbPath);

console.log('Checking if teacher with ID 2 exists...');
const teacherStmt = db.prepare('SELECT * FROM teachers WHERE id = ?');
const teacher = teacherStmt.get(2);
console.log('Teacher:', teacher);

console.log('\nChecking all subjects...');
const subjectsStmt = db.prepare('SELECT * FROM subjects');
const subjects = subjectsStmt.all();
console.log('Subjects:', subjects);

console.log('\nChecking teacher_subjects for teacher ID 2...');
const teacherSubjectsStmt = db.prepare('SELECT * FROM teacher_subjects WHERE teacher_id = ?');
const teacherSubjects = teacherSubjectsStmt.all(2);
console.log('Teacher Subjects:', teacherSubjects);

db.close();
