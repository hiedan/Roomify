const { z } = require('zod');
const { pool, query } = require('../db');
const authService = require('./authService');
const AppError = require('../utils/AppError');

// Public non-account hash, generated at cost 12. Unknown accounts still do a
// bcrypt comparison; knowing a matching dummy password can never grant access.
const UNKNOWN_ACCOUNT_HASH = '$2b$12$I.bci2gXtCNWiBbkxH1ed.iRdba6fgQqonSqy.r6XXi99swKb/L8y';

const emailSchema = z.string().trim().toLowerCase().max(255).email().endsWith('@gmail.com');
const passwordSchema = z.string().superRefine((password, context) => {
  try {
    authService.validatePassword(password);
  } catch (err) {
    if (!(err instanceof AppError)) throw err;
    context.addIssue({ code: z.ZodIssueCode.custom, message: err.message });
  }
});
const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().default(false),
}).strict();
const registrationSchema = loginSchema.extend({
  fullName: z.string().trim().min(2).max(100),
});

function safeProfile(user) {
  return {
    id: String(user.id),
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
  };
}

async function insertTenant(client, fullName, email, passwordHash) {
  try {
    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'tenant', true)
       RETURNING id, full_name, email, role, is_active`,
      [fullName, email, passwordHash]
    );
    return rows[0];
  } catch (err) {
    // Handle concurrent registrations at the actual DB constraint. Other unique
    // violations and infrastructure failures retain their original meaning.
    if (err.code === '23505' && err.constraint === 'users_email_key') {
      throw new AppError(409, 'EMAIL_CONFLICT', 'Email is already registered');
    }
    throw err;
  }
}

async function registerAccount(input) {
  const { fullName, email, password } = registrationSchema.parse(input);
  const passwordHash = await authService.hashPassword(password);
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query('BEGIN');
    const user = await insertTenant(client, fullName, email, passwordHash);
    // Sign before commit: a bad key or signing failure must not leave an account
    // without its initial session. Registration always uses the standard 1h TTL.
    const session = authService.issueToken(user, false);
    await client.query('COMMIT');
    return { user: safeProfile(user), ...session };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Preserve the original failure and discard a potentially broken connection.
      releaseError = rollbackError;
    }
    throw err;
  } finally {
    client.release(releaseError);
  }
}

async function authenticateAccount(input) {
  const { email, password, rememberMe } = loginSchema.parse(input);
  const { rows } = await query(
    'SELECT id, full_name, email, password_hash, role, is_active FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  const matches = await authService.verifyPassword(password, user ? user.password_hash : UNKNOWN_ACCOUNT_HASH);
  if (!user || !matches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  if (!user.is_active) {
    throw new AppError(403, 'INACTIVE_ACCOUNT', 'Account is inactive');
  }
  return { user: safeProfile(user), ...authService.issueToken(user, rememberMe) };
}

module.exports = { registerAccount, authenticateAccount, safeProfile };
