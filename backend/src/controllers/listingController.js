const listings = require('../services/listingService');
const { sendSuccess } = require('../utils/response');

async function remove(req, res, next) {
  try {
    return sendSuccess(res, await listings.deleteOwnedListing(req.user.id, req.params.id, req.body));
  } catch (err) {
    return next(err);
  }
}

module.exports = { remove };
