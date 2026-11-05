const authService = require('../services/authService');
const { query } = require('../db');
const AppError = require('../utils/AppError');
const { isDatabaseId, MAX_DATABASE_ID: MAX_USER_ID } = require('../utils/databaseId');


/** Verify the session, then load the authoritative account on every request. */
async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    const match = typeof header === 'string' && /^Bearer (\S+)$/i.exec(header);
    // Check the entire match because JS's $ also matches before a final newline.
    if (!match || match[0] !== header) {
      throw new AppError(401, 'UNAUTHORIZED', 'A Bearer session token is required');
    }

    const { sub } = authService.verifyToken(match[1]);
    // verifyToken guarantees a positive decimal string. Compare without Number
    // rounding or letting PostgreSQL reject an out-of-range BIGINT as a 500.
    if (sub.length > MAX_USER_ID.length ||
        (sub.length === MAX_USER_ID.length && sub > MAX_USER_ID)) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid session account');
    }

    const { rows } = await query(
      'SELECT id, full_name, email, role, is_active FROM users WHERE id = $1',
      [sub]
    );
    const user = rows[0];
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Session account no longer exists');
    }
    if (!user.is_active) {
      throw new AppError(403, 'INACTIVE_ACCOUNT', 'Account is inactive');
    }

    req.user = {
      id: String(user.id),
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
    };
  } catch (err) {
    // Express 4 does not forward rejected async handlers automatically.
    return next(err);
  }
  return next();
}

/** Guards consume only the active profile populated by requireAuth. */
function currentUser(req) {
  const user = req.user;
  if (!user || !isDatabaseId(user.id) || typeof user.isActive !== 'boolean') {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  }
  if (!user.isActive) {
    throw new AppError(403, 'INACTIVE_ACCOUNT', 'Account is inactive');
  }
  return user;
}

/** Run after requireAuth; req.user is the current DB profile, never a client role. */
function requireRole(...roles) {
  const supported = new Set(['tenant', 'landlord', 'admin']);
  if (!roles.length || roles.some(role => !supported.has(role))) {
    throw new TypeError('requireRole requires an explicit list of supported roles');
  }
  const allowed = new Set(roles);
  return (req, _res, next) => {
    try {
      const user = currentUser(req);
      if (!allowed.has(user.role)) {
        throw new AppError(403, 'FORBIDDEN', 'Account role is not permitted');
      }
    } catch (err) {
      return next(err);
    }
    return next();
  };
}

// Roles have no implicit hierarchy; admin does not bypass a landlord-only guard.
const requireAdmin = requireRole('admin');

/** Listing-specific ownership only; compose after requireAuth and a role guard. */
async function requireOwnership(req, _res, next) {
  try {
    const user = currentUser(req);
    const id = req.params && req.params.id;
    if (!isDatabaseId(id)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A valid listing ID is required');
    }
    const { rows } = await query('SELECT owner_id FROM listings WHERE id = $1', [id]);
    if (!rows[0]) {
      throw new AppError(404, 'NOT_FOUND', 'Listing not found');
    }
    if (String(rows[0].owner_id) !== user.id) {
      throw new AppError(403, 'FORBIDDEN', 'Listing ownership is required');
    }
  } catch (err) {
    return next(err);
  }
  return next();
}

module.exports = { requireAuth, requireRole, requireAdmin, requireOwnership };
