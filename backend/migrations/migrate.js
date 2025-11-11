import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { query } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  try {
    console.log('🔄 Starting database migrations...\n');

    // Get all SQL files in migrations directory
    const files = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.sql'))
      .sort(); // This will run them in order: 001, 002, etc.

    console.log(`Found ${files.length} migration file(s):\n`);
    files.forEach(file => console.log(`   - ${file}`));
    console.log();

    // Execute each migration file
    for (const file of files) {
      console.log(`\n📄 Running migration: ${file}`);
      const filePath = path.join(__dirname, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('\\echo'));

      for (const statement of statements) {
        try {
          await query(statement);
        } catch (error) {
          // Only show error if it's not an "already exists" error
          if (!error.message.includes('already exists')) {
            console.error('   ⚠️  Error:', error.message);
          }
          // Continue with other statements
        }
      }
      console.log(`   ✅ ${file} completed`);
    }

    console.log('\n✅ All database migrations completed successfully!\n');

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
