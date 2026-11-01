const listings = require('../services/listings');
const { sendPaginated } = require('../utils/response');

async function list(req, res) {
  const result = await listings.listApproved(req.query);
  return sendPaginated(res, result.items, result.pagination);
}
module.exports = { list };
