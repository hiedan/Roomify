jest.mock('../src/services/listingSearchService', () => ({
  getListingFilterOptions: jest.fn(),
  searchListings: jest.fn(),
  getApprovedListingById: jest.fn(),
}));

const request = require('supertest');
const { createApp } = require('../src/app');
const listingSearch = require('../src/services/listingSearchService');
const AppError = require('../src/utils/AppError');

const api = request(createApp());

beforeEach(() => {
  jest.clearAllMocks();
});

test('public listings route forwards search criteria and preserves pagination metadata', async () => {
  listingSearch.searchListings.mockResolvedValue({
    listings: [{ id: '1', title: 'Synthetic public listing' }],
    pagination: { page: 2, limit: 12, total: 14 },
  });

  const response = await api.get('/api/v1/listings')
    .query({ keyword: 'synthetic', district: 'Bình Thạnh', page: '2' });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    success: true,
    data: [{ id: '1', title: 'Synthetic public listing' }],
    pagination: { page: 2, limit: 12, total: 14 },
  });
  expect(listingSearch.searchListings).toHaveBeenCalledWith({
    keyword: 'synthetic', district: 'Bình Thạnh', page: '2',
  });
});

test('public filters route returns the service result in the standard success envelope', async () => {
  const filters = {
    districts: ['Bình Thạnh'],
    roomTypes: [{ code: 'studio', name: 'Studio / căn hộ mini' }],
    amenities: [{ id: '1', name: 'Wifi' }],
  };
  listingSearch.getListingFilterOptions.mockResolvedValue(filters);

  const response = await api.get('/api/v1/listings/filters');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ success: true, data: filters });
  expect(listingSearch.getListingFilterOptions).toHaveBeenCalledTimes(1);
});

test('public search service errors are forwarded to the standard error handler', async () => {
  listingSearch.searchListings.mockRejectedValue(new AppError(400, 'VALIDATION_ERROR', 'page: Invalid value'));

  const response = await api.get('/api/v1/listings').query({ page: '0' });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'page: Invalid value' },
  });
});

test('unexpected search service failures use the standard internal error response', async () => {
  listingSearch.searchListings.mockRejectedValue(new Error('Synthetic database failure'));
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const response = await api.get('/api/v1/listings').query({ keyword: 'room' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'INTERNAL', message: 'Internal server error' },
    });
    expect(JSON.stringify(response.body)).not.toContain('Synthetic database failure');
    expect(errorLog).toHaveBeenCalledWith('Unexpected server error');
  } finally {
    errorLog.mockRestore();
  }
});

test('public listing detail route returns the service result in the standard success envelope', async () => {
  const detail = {
    id: '123',
    title: 'Synthetic approved listing',
    description: 'Public detail description',
    images: [{ url: 'https://example.test/image.jpg', isCover: true }],
    amenities: [],
  };
  listingSearch.getApprovedListingById.mockResolvedValue(detail);

  const response = await api.get('/api/v1/listings/123');

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ success: true, data: detail });
  expect(listingSearch.getApprovedListingById).toHaveBeenCalledWith('123');
});

test('public listing detail route forwards not-found service errors', async () => {
  listingSearch.getApprovedListingById.mockRejectedValue(new AppError(404, 'NOT_FOUND', 'Listing not found'));

  const response = await api.get('/api/v1/listings/123');

  expect(response.status).toBe(404);
  expect(response.body).toEqual({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Listing not found' },
  });
});
