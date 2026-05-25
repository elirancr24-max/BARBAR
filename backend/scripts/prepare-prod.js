#!/usr/bin/env node
/**
 * Prepare Prisma schema for production (PostgreSQL).
 * Run automatically during Render/Railway build, or manually with:
 *   node scripts/prepare-prod.js
 *
 * Behavior:
 * - Changes datasource provider from "sqlite" → "postgresql"
 * - Removes the auto-generated SQLite-specific migrations folder
 *   (Render will create a fresh Postgres migration from the schema on first deploy)
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const schemaPath = path.join(root, 'prisma', 'schema.prisma');
const migrationsDir = path.join(root, 'prisma', 'migrations');

console.log('🔧 prepare-prod: switching Prisma provider to postgresql');

let schema = fs.readFileSync(schemaPath, 'utf8');
const newSchema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');

if (schema === newSchema) {
  console.log('   ✓ provider already postgresql (or no sqlite found)');
} else {
  fs.writeFileSync(schemaPath, newSchema, 'utf8');
  console.log('   ✓ provider switched to postgresql');
}

// Remove SQLite migrations so Postgres gets a fresh init
if (fs.existsSync(migrationsDir)) {
  const subdirs = fs.readdirSync(migrationsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const sub of subdirs) {
    const migPath = path.join(migrationsDir, sub.name, 'migration.sql');
    if (fs.existsSync(migPath)) {
      const sql = fs.readFileSync(migPath, 'utf8').toLowerCase();
      if (sql.includes('integer primary key') || sql.includes('datetime')) {
        // SQLite-specific migration → remove
        fs.rmSync(path.join(migrationsDir, sub.name), { recursive: true });
        console.log(`   ✓ removed SQLite migration: ${sub.name}`);
      }
    }
  }
}

console.log('✅ prepare-prod done');
