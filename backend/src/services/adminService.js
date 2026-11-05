const { z } = require('zod');
const { pool } = require('../db');
const AppError = require('../utils/AppError');
const { isDatabaseId } = require('../utils/databaseId');
const { safeProfile } = require('./authAccountService');

const targetSchema = z.string().refine(isDatabaseId, 'A valid target account ID is required');
const roleSchema = z.object({ role: z.enum(['tenant', 'landlord']) }).strict();
const statusSchema = z.object({ isActive: z.boolean() }).strict();

async function changeAccount(actorId, targetId, kind, value) {
  if (!isDatabaseId(actorId)) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  }
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query('BEGIN');
    // Lock both users in numeric ID order. Concurrent admin requests follow the
    // same order, and authorization stays stable until update + audit commit.
    const { rows } = await client.query(
      `SELECT id, full_name, email, role, is_active FROM users
       WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE`, [[actorId, targetId]]
    );
    const actor = rows.find(row => row.id === actorId);
    if (!actor) throw new AppError(401, 'UNAUTHORIZED', 'Session account no longer exists');
    if (!actor.is_active) throw new AppError(403, 'INACTIVE_ACCOUNT', 'Account is inactive');
    if (actor.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Administrator access is required');

    const target = rows.find(row => row.id === targetId);
    if (!target) throw new AppError(404, 'NOT_FOUND', 'Target account not found');
    if (target.role === 'admin') throw new AppError(403, 'FORBIDDEN', 'Administrator accounts cannot be managed');
    const previous = kind === 'role' ? target.role : target.is_active;
    if (previous === value) {
      await client.query('COMMIT');
      return { user: safeProfile(target), changed: false };
    }

    // These are fixed statements; no client-supplied SQL identifiers are used.
    const sql = kind === 'role'
      ? 'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, full_name, email, role, is_active'
      : 'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, full_name, email, role, is_active';
    const updated = await client.query(sql, [value, targetId]);
    if (!updated.rows[0]) throw new Error('Account update did not return a row');
    const action = kind === 'role' ? 'role_change' : value ? 'account_enable' : 'account_disable';
    await client.query(
      `INSERT INTO admin_action_audits
       (actor_user_id, target_user_id, action_type, previous_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`, [actorId, targetId, action, String(previous), String(value)]
    );
    await client.query('COMMIT');
    return { user: safeProfile(updated.rows[0]), changed: true };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      releaseError = rollbackError;
    }
    throw err;
  } finally {
    client.release(releaseError);
  }
}

async function changeRole(actorId, targetId, input) {
  const id = targetSchema.parse(targetId);
  const { role } = roleSchema.parse(input);
  return changeAccount(actorId, id, 'role', role);
}

async function changeStatus(actorId, targetId, input) {
  const id = targetSchema.parse(targetId);
  const { isActive } = statusSchema.parse(input);
  return changeAccount(actorId, id, 'status', isActive);
}

module.exports = { changeRole, changeStatus };
