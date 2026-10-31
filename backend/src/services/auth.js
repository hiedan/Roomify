const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const users = require('../database/users');
const config = require('../config');
const AppError = require('../utils/AppError');

function userDto(user) {
  return { id: user.id, fullName: user.full_name, email: user.email, role: user.role };
}

function createSession(user, remember = false) {
  if (!config.jwtSecret) throw new AppError(500, 'CONFIG_ERROR', 'Chưa cấu hình JWT_SECRET');
  const token = jwt.sign({}, config.jwtSecret, {
    subject: String(user.id), algorithm: 'HS256', expiresIn: remember ? '7d' : config.jwtExpiresIn,
  });
  return { token, user: userDto(user) };
}

async function register(input) {
  if (!config.jwtSecret) throw new AppError(500, 'CONFIG_ERROR', 'Chưa cấu hình JWT_SECRET');
  const passwordHash = await bcrypt.hash(input.password, 12);
  let user;
  try {
    user = await users.create({ ...input, passwordHash });
  } catch (error) {
    if (error.code === '23505') throw new AppError(409, 'EMAIL_EXISTS', 'Gmail đã được đăng ký');
    throw error;
  }
  return createSession(user);
}

async function login({ email, password, remember }) {
  const user = await users.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Gmail hoặc mật khẩu không đúng');
  }
  if (!user.is_active) throw new AppError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa');
  return createSession(user, remember);
}

async function authenticate(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || !/^\d+$/.test(payload.sub)) throw new Error();
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }
  const user = await users.findById(payload.sub);
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Tài khoản không tồn tại');
  if (!user.is_active) throw new AppError(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa');
  return userDto(user);
}
module.exports = { register, login, authenticate };
