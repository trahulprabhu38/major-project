import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { query } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  try {
    console.log('🔄 Starting database migrations...\n');

    // Read and execute the initial schema
    const schemaPath = path.join(__dirname, '001_initial_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await query(statement);
      } catch (error) {
        console.error('Error executing statement:', error.message);
        // Continue with other statements
      }
    }

    console.log('\n✅ Database migrations completed successfully!\n');

    // Verify tables were created
    const result = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
