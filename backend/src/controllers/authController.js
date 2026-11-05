const accounts = require('../services/authAccountService');
const { sendSuccess } = require('../utils/response');

async function register(req, res, next) {
  try {
    const session = await accounts.registerAccount(req.body);
    return sendSuccess(res, session, 201);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const session = await accounts.authenticateAccount(req.body);
    return sendSuccess(res, session);
  } catch (err) {
    return next(err);
  }
}

function me(req, res) {
  return sendSuccess(res, req.user);
}

function logout(_req, res) {
  // Bearer sessions live in browser storage. The client clears both storage
  // locations and its in-memory profile; this design has no JWT revocation store.
  return sendSuccess(res, { loggedOut: true });
}

module.exports = { register, login, me, logout };
