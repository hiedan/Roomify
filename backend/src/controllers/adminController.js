const admin = require('../services/adminService');
const { sendSuccess } = require('../utils/response');

async function updateRole(req, res, next) {
  try {
    return sendSuccess(res, await admin.changeRole(req.user.id, req.params.id, req.body));
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    return sendSuccess(res, await admin.changeStatus(req.user.id, req.params.id, req.body));
  } catch (err) {
    return next(err);
  }
}

module.exports = { updateRole, updateStatus };
