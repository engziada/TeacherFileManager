import { db, sqlite } from "../server/db-utils";

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

export async function up() {
  console.log('Adding common subjects to the database...');
  
  try {
    const now = new Date().toISOString();
    
    // Create subjects table if not exists
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_ar TEXT NOT NULL
      );
    `);
    
    // Prepare the insert statement
    const stmt = sqlite.prepare(`
      INSERT OR IGNORE INTO subjects (name_ar)
      VALUES (?)
    `);
    
    // Insert each subject in a transaction
    sqlite.transaction(() => {
      for (const subjectName of commonSubjects) {
        try {
          stmt.run(subjectName);
          console.log(`Added subject: ${subjectName}`);
        } catch (error) {
          console.error(`Error adding subject ${subjectName}:`, error);
          throw error; // This will rollback the transaction
        }
      }
    })();
    
    console.log('Common subjects added successfully');
  } catch (error) {
    console.error('Error in migration:', error);
    throw error;
  }
}

export async function down() {
  // No need to remove subjects on rollback
  console.log('No need to remove subjects on rollback');
}
