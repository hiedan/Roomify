const auth = require('../services/auth');
const { sendSuccess } = require('../utils/response');

async function register(req, res) {
  return sendSuccess(res, await auth.register(req.body), 201);
}
async function login(req, res) {
  return sendSuccess(res, await auth.login(req.body));
}
async function me(req, res) {
  return sendSuccess(res, { user: req.user });
}
module.exports = { register, login, me };
