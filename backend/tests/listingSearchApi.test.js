jest.mock('../src/services/listingSearchService', () => ({
  getListingFilterOptions: jest.fn(),
  searchListings: jest.fn(),
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
