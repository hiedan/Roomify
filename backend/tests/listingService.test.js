jest.mock('../src/db', () => ({ pool: { connect: jest.fn() } }));
const { pool } = require('../src/db');
const { deleteOwnedListing } = require('../src/services/listingService');
let client;
beforeEach(() => {
  client = { query: jest.fn(async sql => {
    if (sql.startsWith('SELECT role')) return { rows: [{ role: 'landlord', is_active: true }] };
    if (sql.startsWith('SELECT owner_id')) return { rows: [{ owner_id: '9007199254740993' }] };
    if (sql.startsWith('DELETE')) return { rows: [{ id: '9223372036854775807' }] };
    return { rows: [] };
  }), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
});

test('rollback failure preserves the original database error and discards the connection', async () => {
  const original = new Error('Synthetic delete failure');
  const broken = new Error('Synthetic rollback failure');
  const normal = client.query.getMockImplementation();
  client.query.mockImplementation(async sql => {
    if (sql.startsWith('DELETE')) throw original;
    if (sql === 'ROLLBACK') throw broken;
    return normal(sql);
  });
  await expect(deleteOwnedListing('9007199254740993', '9223372036854775807')).rejects.toBe(original);
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(client.release).toHaveBeenCalledWith(broken);
});
test('commit failure rolls back and releases exactly once without reporting deletion success', async () => {
  const original = new Error('Synthetic commit failure');
  const normal = client.query.getMockImplementation();
  client.query.mockImplementation(async (sql, params) => {
    if (sql === 'COMMIT') throw original;
    return normal(sql, params);
  });
  await expect(deleteOwnedListing('9007199254740993', '9223372036854775807')).rejects.toBe(original);
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalledTimes(1);
  expect(client.release).toHaveBeenCalledWith(undefined);
});
test('connection checkout error retains its meaning without trying to release a nonexistent client', async () => {
  const original = new Error('Synthetic connection failure');
  pool.connect.mockRejectedValue(original);
  await expect(deleteOwnedListing('9007199254740993', '9223372036854775807')).rejects.toBe(original);
  expect(client.query).not.toHaveBeenCalled();
  expect(client.release).not.toHaveBeenCalled();
});
test('an unexpected empty conditional DELETE is rolled back instead of returning false success', async () => {
  const normal = client.query.getMockImplementation();
  client.query.mockImplementation(sql => sql.startsWith('DELETE') ? { rows: [] } : normal(sql));
  await expect(deleteOwnedListing('9007199254740993', '9223372036854775807')).rejects.toThrow('did not return a row');
  expect(client.query).toHaveBeenCalledWith(
    'DELETE FROM listings WHERE id = $1 AND owner_id = $2 RETURNING id', ['9223372036854775807', '9007199254740993']
  );
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  expect(client.release).toHaveBeenCalledTimes(1);
});
