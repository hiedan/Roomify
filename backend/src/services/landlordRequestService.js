const { z } = require('zod');
const { pool, query } = require('../db');
const AppError = require('../utils/AppError');
const { isDatabaseId } = require('../utils/databaseId');
const { safeProfile } = require('./authAccountService');

const idSchema = z.string().refine(isDatabaseId, 'A valid request ID is required');
const applicationSchema = z.object({
  contactName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).regex(/^\+?[0-9 ()-]+$/, 'A valid phone number is required')
    .refine(value => { const digits = value.replace(/\D/g, ''); return digits.length >= 9 && digits.length <= 15; }, 'Phone must contain 9 to 15 digits'),
  message: z.string().trim().max(1000).default(''),
}).strict();
const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().max(500).optional(),
}).strict().superRefine((value, context) => {
  if (value.decision === 'rejected' && (!value.reason || value.reason.length < 5)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'A rejection reason of at least 5 characters is required' });
  }
});

function application(row, includeApplicant = false) {
  if (!row || !row.id) return null;
  return {
    id: String(row.id), userId: String(row.user_id), contactName: row.contact_name,
    phone: row.phone, message: row.message,
    status: row.status, rejectionReason: row.rejection_reason,
    createdAt: row.created_at, reviewedAt: row.reviewed_at,
    ...(includeApplicant ? { applicant: { fullName: row.full_name, email: row.email, role: row.role, isActive: row.is_active } } : {}),
  };
}

function activeAccount(account) {
  if (!account) throw new AppError(401, 'UNAUTHORIZED', 'Session account no longer exists');
  if (!account.is_active) throw new AppError(403, 'INACTIVE_ACCOUNT', 'Account is inactive');
}

async function transaction(work) {
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { releaseError = rollbackError; }
    throw error;
  } finally { client.release(releaseError); }
}

async function latest(userId) {
  const { rows } = await query(
    `SELECT u.role AS current_role, r.* FROM users u LEFT JOIN LATERAL (
       SELECT * FROM landlord_requests WHERE user_id = u.id ORDER BY created_at DESC, id DESC LIMIT 1
     ) r ON true WHERE u.id = $1`, [userId]
  );
  return { application: application(rows[0]), currentRole: rows[0]?.current_role || null };
}

async function submit(userId, input) {
  const values = applicationSchema.parse(input);
  return transaction(async client => {
    // Lock the account before its requests, sharing the admin account lock order.
    const { rows } = await client.query('SELECT id, role, is_active FROM users WHERE id = $1 FOR UPDATE', [userId]);
    activeAccount(rows[0]);
    if (rows[0].role !== 'tenant') throw new AppError(403, 'FORBIDDEN', 'Only tenants can request landlord access');
    const pending = await client.query("SELECT id FROM landlord_requests WHERE user_id = $1 AND status = 'pending'", [userId]);
    if (pending.rowCount) throw new AppError(409, 'REQUEST_PENDING', 'A landlord request is already awaiting review');
    // Keep the legacy NOT NULL column compatible without collecting a property address.
    const result = await client.query(
      `INSERT INTO landlord_requests (user_id, contact_name, phone, property_address, message)
       VALUES ($1, $2, $3, '', $4) RETURNING *`,
      [userId, values.contactName, values.phone, values.message]
    );
    return { application: application(result.rows[0]) };
  });
}

async function list(input) {
  const { status } = z.object({ status: z.enum(['pending', 'approved', 'rejected']).default('pending') }).strict().parse(input);
  // Bound response size; only administrators can access applicant contact information.
  const { rows } = await query(
    `SELECT r.*, u.full_name, u.email, u.role, u.is_active FROM landlord_requests r
     JOIN users u ON u.id = r.user_id WHERE r.status = $1 ORDER BY r.created_at, r.id LIMIT 100`, [status]
  );
  return { applications: rows.map(row => application(row, true)), limit: 100 };
}

async function review(actorId, requestId, input) {
  const id = idSchema.parse(requestId);
  const { decision, reason } = reviewSchema.parse(input);
  return transaction(async client => {
    const found = await client.query('SELECT user_id FROM landlord_requests WHERE id = $1', [id]);
    if (!found.rowCount) throw new AppError(404, 'NOT_FOUND', 'Landlord request not found');
    const userId = String(found.rows[0].user_id);
    const { rows } = await client.query(
      'SELECT id, full_name, email, role, is_active FROM users WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE',
      [[actorId, userId]]
    );
    const actor = rows.find(row => String(row.id) === actorId);
    activeAccount(actor);
    if (actor.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Administrator access is required');
    const target = rows.find(row => String(row.id) === userId);
    if (!target) throw new AppError(404, 'NOT_FOUND', 'Applicant account not found');
    if (target.role === 'admin' && decision === 'approved') {
      throw new AppError(409, 'REQUEST_INELIGIBLE', 'Tài khoản này hiện là Quản trị viên, không thể cấp quyền Chủ trọ. Có thể từ chối để đóng yêu cầu cũ.');
    }
    const locked = await client.query('SELECT * FROM landlord_requests WHERE id = $1 FOR UPDATE', [id]);
    if (!locked.rowCount) throw new AppError(404, 'NOT_FOUND', 'Landlord request not found');
    const current = locked.rows[0];
    if (current.status !== 'pending') {
      if (current.status !== decision) throw new AppError(409, 'REQUEST_REVIEWED', 'This request has already been reviewed');
      return { application: application(current), user: safeProfile(target), changed: false };
    }
    let user = target;
    if (decision === 'approved') {
      activeAccount(target);
      if (target.role === 'tenant') {
        const result = await client.query("UPDATE users SET role = 'landlord' WHERE id = $1 RETURNING id, full_name, email, role, is_active", [userId]);
        user = result.rows[0];
        await client.query(
          `INSERT INTO admin_action_audits (actor_user_id, target_user_id, action_type, previous_value, new_value)
           VALUES ($1, $2, 'role_change', 'tenant', 'landlord')`, [actorId, userId]
        );
      }
    }
    const updated = await client.query(
      `UPDATE landlord_requests SET status = $1, rejection_reason = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`, [decision, decision === 'rejected' ? reason : null, actorId, id]
    );
    return { application: application(updated.rows[0]), user: safeProfile(user), changed: true };
  });
}

module.exports = { latest, submit, list, review };
