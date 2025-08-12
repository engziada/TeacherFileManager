import { up } from './migrations/001_add_common_subjects';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    // Run the migration
    await up();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigrations();
