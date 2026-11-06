const service = require('../services/landlordRequestService');
const { sendSuccess } = require('../utils/response');

async function latest(req, res, next) {
  try { return sendSuccess(res, await service.latest(req.user.id)); } catch (error) { return next(error); }
}
async function submit(req, res, next) {
  try { return sendSuccess(res, await service.submit(req.user.id, req.body), 201); } catch (error) { return next(error); }
}
async function list(req, res, next) {
  try { return sendSuccess(res, await service.list(req.query)); } catch (error) { return next(error); }
}
async function review(req, res, next) {
  try { return sendSuccess(res, await service.review(req.user.id, req.params.id, req.body)); } catch (error) { return next(error); }
}

module.exports = { latest, submit, list, review };
