const auth = require('../services/auth');
const AppError = require('../utils/AppError');

module.exports = async (req, _res, next) => {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  if (!match) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
  req.user = await auth.authenticate(match[1]);
  next();
};
