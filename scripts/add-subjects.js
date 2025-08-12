import sqlite3 from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the database file
const dbPath = path.join(process.cwd(), 'data', 'app.db');
console.log(`Connecting to database at: ${dbPath}`);

// Connect to the database
const db = sqlite3(dbPath);

// Common subjects to add
const commonSubjects = [
  "اللغة العربية",
  "الرياضيات",
  "العلوم",
  "اللغة الإنجليزية",
  "الدراسات الاجتماعية",
  "التربية الإسلامية",
  "القرآن الكريم",
  "التربية الفنية",
  "التربية الرياضية",
  "الحاسب الآلي",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "التاريخ",
  "الجغرافيا",
  "الفلسفة والمنطق",
  "علم النفس",
  "الاقتصاد",
  "اللغة الفرنسية",
  "اللغة الألمانية"
];

// Function to add subjects
try {
  // Create the subjects table if it doesn't exist
  db.prepare(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nameAr TEXT NOT NULL UNIQUE,
      createdByTeacherId INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (createdByTeacherId) REFERENCES teachers(id) ON DELETE SET NULL
    )
  `).run();

  // Prepare the insert statement
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO subjects (nameAr, createdAt, updatedAt)
    VALUES (?, ?, ?)
  `);

  const now = new Date().toISOString();
  
  // Insert subjects in a transaction
  const insertMany = db.transaction((subjects) => {
    for (const subject of subjects) {
      try {
        insertStmt.run(subject, now, now);
        console.log(`Added subject: ${subject}`);
      } catch (error) {
        console.error(`Error adding subject ${subject}:`, error.message);
      }
    }
  });

  // Execute the transaction
  insertMany(commonSubjects);
  
  console.log('Successfully added all subjects');
} catch (error) {
  console.error('Error in script:', error);
} finally {
  // Close the database connection
  db.close();
}
