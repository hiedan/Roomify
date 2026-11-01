const { query } = require('../db');

async function findByEmail(email) {
  const { rows } = await query(
    'SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = $1',
    [email]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await query(
    'SELECT id, full_name, email, role, is_active FROM users WHERE id = $1', [id]
  );
  return rows[0];
}

async function create({ fullName, email, passwordHash }) {
  const { rows } = await query(
    `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, 'tenant')
     RETURNING id, full_name, email, role`, [fullName, email, passwordHash]
  );
  return rows[0];
}
module.exports = { findByEmail, findById, create };
