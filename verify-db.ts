import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function verifySchema() {
  console.log('Inspecting database schema...');
  try {
    const tables = await db.all(sql`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`);
    console.log('Tables found in database:');
    console.table(tables);
  } catch (error) {
    console.error('Error verifying schema:', error);
  }
}

verifySchema();
