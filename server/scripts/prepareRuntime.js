const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../models/db');

async function main() {
  const migrationDirectory = path.join(__dirname, '..', 'migrations');
  for (const name of fs.readdirSync(migrationDirectory).filter((item) => item.endsWith('.sql')).sort()) {
    await db.query(fs.readFileSync(path.join(migrationDirectory, name), 'utf8'));
  }
  const email = process.env.PROVISION_ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Runtime administrator credentials are required');
  await db.query(
    `INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'admin')
     ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,updated_at=NOW()`,
    [process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator', email.toLowerCase(), await bcrypt.hash(password, 10)],
  );
  await db.pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
