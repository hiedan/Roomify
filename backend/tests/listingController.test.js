jest.mock('../src/services/listingService', () => ({
  createListing: jest.fn(),
  getLandlordListings: jest.fn(),
  getLandlordListingById: jest.fn(),
  updateOwnedListing: jest.fn(),
  deleteOwnedListing: jest.fn(),
}));
jest.mock('../src/services/listingSearchService', () => ({
  getListingFilterOptions: jest.fn(),
  searchListings: jest.fn(),
  getApprovedListingById: jest.fn(),
}));

const listings = require('../src/services/listingService');
const controller = require('../src/controllers/listingController');

function createMockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listingController', () => {
  test('create calls createListing and returns 201 with standard envelope', async () => {
    const payload = { title: 'Test Room', price: 3000000 };
    const createdResult = { id: '101', title: 'Test Room', status: 'pending' };
    listings.createListing.mockResolvedValue(createdResult);

    const req = { user: { id: '9007199254740993' }, body: payload };
    const res = createMockRes();
    const next = jest.fn();

    await controller.create(req, res, next);

    expect(listings.createListing).toHaveBeenCalledWith('9007199254740993', payload);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: createdResult });
    expect(next).not.toHaveBeenCalled();
  });

  test('create forwards service errors to next', async () => {
    const error = new Error('Creation failure');
    listings.createListing.mockRejectedValue(error);

    const req = { user: { id: '9007199254740993' }, body: {} };
    const res = createMockRes();
    const next = jest.fn();

    await controller.create(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('mine calls getLandlordListings and returns 200 with standard envelope', async () => {
    const query = { status: 'pending' };
    const mineResult = {
      listings: [{ id: '101', title: 'Room 1' }],
      summary: { total: 1, pending: 1, approved: 0, rejected: 0 },
    };
    listings.getLandlordListings.mockResolvedValue(mineResult);

    const req = { user: { id: '9007199254740993' }, query };
    const res = createMockRes();
    const next = jest.fn();

    await controller.mine(req, res, next);

    expect(listings.getLandlordListings).toHaveBeenCalledWith('9007199254740993', query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mineResult });
    expect(next).not.toHaveBeenCalled();
  });

  test('mineDetail calls getLandlordListingById and returns 200 with standard envelope', async () => {
    const detailResult = { id: '101', title: 'Room 1', status: 'rejected', rejectReason: 'Reason' };
    listings.getLandlordListingById.mockResolvedValue(detailResult);

    const req = { user: { id: '9007199254740993' }, params: { id: '101' } };
    const res = createMockRes();
    const next = jest.fn();

    await controller.mineDetail(req, res, next);

    expect(listings.getLandlordListingById).toHaveBeenCalledWith('9007199254740993', '101');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: detailResult });
    expect(next).not.toHaveBeenCalled();
  });

  test('update calls updateOwnedListing and returns 200 with standard envelope', async () => {
    const updateBody = { price: 3500000 };
    const updatedResult = { id: '101', price: 3500000, status: 'pending' };
    listings.updateOwnedListing.mockResolvedValue(updatedResult);

    const req = { user: { id: '9007199254740993' }, params: { id: '101' }, body: updateBody };
    const res = createMockRes();
    const next = jest.fn();

    await controller.update(req, res, next);

    expect(listings.updateOwnedListing).toHaveBeenCalledWith('9007199254740993', '101', updateBody);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: updatedResult });
    expect(next).not.toHaveBeenCalled();
  });

  test('remove calls deleteOwnedListing and returns 200 with standard envelope', async () => {
    const deleteResult = { id: '101', deleted: true };
    listings.deleteOwnedListing.mockResolvedValue(deleteResult);

    const req = { user: { id: '9007199254740993' }, params: { id: '101' }, body: {} };
    const res = createMockRes();
    const next = jest.fn();

    await controller.remove(req, res, next);

    expect(listings.deleteOwnedListing).toHaveBeenCalledWith('9007199254740993', '101', {});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: deleteResult });
    expect(next).not.toHaveBeenCalled();
  });
});
