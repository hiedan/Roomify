const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');

const BCRYPT_ROUNDS = 12;
const JWT_ALGORITHM = 'HS256';
const MIN_SIGNING_KEY_BYTES = 32;
const STANDARD_TTL = 3600;
const REMEMBERED_TTL = 604800;
const ROLES = new Set(['tenant', 'landlord', 'admin']);
const UNSAFE_SECRETS = new Set([
  'dev-secret-change-me', // config.js fallback
  'change-me', // .env.example
  'changeme',
  'change_me',
  'secret',
  'jwt-secret',
  'your-secret-key',
  'your-jwt-secret',
  'your_jwt_secret',
  'your_jwt_secret_here',
  'default',
  'default-secret',
]);

function validatePassword(password) {
  if (
    typeof password !== 'string' ||
    Buffer.byteLength(password, 'utf8') > 72 ||
    [...password].length < 8
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Password must contain at least 8 characters and at most 72 UTF-8 bytes'
    );
  }
}

/** Hash the original password with a fresh salt; reject bcrypt truncation up front. */
async function hashPassword(password) {
  validatePassword(password);
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Resolve to a match boolean; invalid password input raises VALIDATION_ERROR. */
async function verifyPassword(password, passwordHash) {
  validatePassword(password);
  if (typeof passwordHash !== 'string' || !passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

function getSigningSecret() {
  const secret = config.jwtSecret;
  if (
    typeof secret !== 'string' ||
    !secret.trim() ||
    Buffer.byteLength(secret, 'utf8') < MIN_SIGNING_KEY_BYTES ||
    UNSAFE_SECRETS.has(secret.trim().toLowerCase())
  ) {
    throw new AppError(
      500,
      'AUTH_CONFIG_ERROR',
      'JWT signing key must be non-placeholder and at least 32 UTF-8 bytes'
    );
  }
  return secret;
}

function isValidUserId(id) {
  return (
    (typeof id === 'string' && /^[1-9]\d*$/.test(id)) ||
    (typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
  );
}

/**
 * Return { token, expiresIn } for a trusted account supplied by the caller.
 * The role is a snapshot only: current DB role/status checks belong to requireAuth.
 */
function issueToken(user, rememberMe = false) {
  const secret = getSigningSecret();
  if (typeof rememberMe !== 'boolean') {
    throw new AppError(400, 'VALIDATION_ERROR', 'rememberMe must be a boolean');
  }
  if (!user || !isValidUserId(user.id) || !ROLES.has(user.role)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A valid account ID and role are required');
  }

  const expiresIn = rememberMe ? REMEMBERED_TTL : STANDARD_TTL;
  // Build claims explicitly so credentials and caller-supplied JWT options cannot leak in.
  const token = jwt.sign({ sub: String(user.id), role: user.role }, secret, {
    algorithm: JWT_ALGORITHM,
    expiresIn,
  });
  return { token, expiresIn };
}

/** Verify a raw compact JWT and return safe claims; this performs no DB authorization. */
function verifyToken(token) {
  const secret = getSigningSecret();
  const unauthorized = () => new AppError(401, 'UNAUTHORIZED', 'Invalid or expired session token');
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    throw unauthorized();
  }

  let claims;
  try {
    claims = jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] });
  } catch {
    // Invalid payload JSON can also raise native parser errors inside jsonwebtoken.
    throw unauthorized();
  }

  // jsonwebtoken checks expiry only when exp exists; require it and the account claims.
  if (
    !claims ||
    typeof claims !== 'object' ||
    typeof claims.sub !== 'string' ||
    !isValidUserId(claims.sub) ||
    !ROLES.has(claims.role) ||
    !Number.isSafeInteger(claims.iat) ||
    !Number.isSafeInteger(claims.exp) ||
    claims.exp <= claims.iat
  ) {
    throw unauthorized();
  }
  return { sub: claims.sub, role: claims.role, iat: claims.iat, exp: claims.exp };
}

module.exports = { hashPassword, verifyPassword, issueToken, verifyToken, validatePassword };
