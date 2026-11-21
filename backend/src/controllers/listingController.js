const listings = require('../services/listingService');
const listingSearch = require('../services/listingSearchService');
const { sendPaginated, sendSuccess } = require('../utils/response');

async function filters(_req, res, next) {
  try {
    return sendSuccess(res, await listingSearch.getListingFilterOptions());
  } catch (err) {
    return next(err);
  }
}

async function search(req, res, next) {
  try {
    const result = await listingSearch.searchListings(req.query);
    return sendPaginated(res, result.listings, result.pagination);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    return sendSuccess(res, await listings.createListing(req.user.id, req.body), 201);
  } catch (err) {
    return next(err);
  }
}

async function mine(req, res, next) {
  try {
    return sendSuccess(res, await listings.getLandlordListings(req.user.id, req.query));
  } catch (err) {
    return next(err);
  }
}

async function mineDetail(req, res, next) {
  try {
    return sendSuccess(res, await listings.getLandlordListingById(req.user.id, req.params.id));
  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  try {
    return sendSuccess(res, await listingSearch.getApprovedListingById(req.params.id));
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    return sendSuccess(res, await listings.updateOwnedListing(req.user.id, req.params.id, req.body));
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    return sendSuccess(res, await listings.deleteOwnedListing(req.user.id, req.params.id, req.body));
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  filters,
  search,
  create,
  mine,
  mineDetail,
  detail,
  update,
  remove,
};
