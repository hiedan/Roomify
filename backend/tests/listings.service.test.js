jest.mock('../src/database/listings', () => ({ findApproved: jest.fn() }));
const database = require('../src/database/listings');
const service = require('../src/services/listings');
test('maps only public fields and delegates pagination', async () => {
  database.findApproved.mockResolvedValue({ total: 1, items: [{ id: 1, title: 'Room', price: 1, area_m2: 20, address: 'A', district: 'D', lat: 10, lng: 106, owner_id: 99 }] });
  const result = await service.listApproved({ page: 2, limit: 10 });
  expect(database.findApproved).toHaveBeenCalledWith({ page: 2, limit: 10 });
  expect(result.items[0].id).toBe('1');
  expect(result.items[0]).not.toHaveProperty('owner_id');
  expect(result.pagination).toEqual({ page: 2, limit: 10, total: 1 });
});
