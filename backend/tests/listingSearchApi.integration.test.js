const { assertTestTarget } = require('../src/databaseConfig');
const request = require('supertest');
const { randomUUID } = require('node:crypto');
const { createApp } = require('../src/app');
const { query } = require('../src/db');

const api = request(createApp());
const users = [];
const listings = [];
let keyword;
let district;

beforeAll(() => {
  assertTestTarget();
});

beforeEach(async () => {
  keyword = `search-${randomUUID()}`;
  district = `District-${randomUUID()}`;
  const account = await query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ('Search test owner', $1, 'non-login-fixture-hash', 'landlord')
     RETURNING id`,
    [`search-${randomUUID()}@example.test`]
  );
  users.push(account.rows[0].id);

  for (const status of ['approved', 'pending', 'rejected']) {
    const listing = await query(
      `INSERT INTO listings
        (owner_id, title, description, price, area_m2, address, district, lat, lng, geom, status)
       VALUES ($1, $2, $3, 4500000, 24, '12 Search Street', $4, 10, 106,
         ST_SetSRID(ST_MakePoint(106, 10), 4326)::geography, $5)
       RETURNING id`,
      [users[0], `${keyword} ${status}`, 'Private synthetic description', district, status]
    );
    listings.push(listing.rows[0].id);
    if (status === 'approved') {
      await query('INSERT INTO listing_images (listing_id, url, is_cover) VALUES ($1, $2, true)',
        [listing.rows[0].id, `https://example.test/${keyword}.jpg`]);
    }
  }
});

afterEach(async () => {
  if (listings.length) await query('DELETE FROM listings WHERE id = ANY($1::bigint[])', [listings]);
  if (users.length) await query('DELETE FROM users WHERE id = ANY($1::bigint[])', [users]);
  listings.length = 0;
  users.length = 0;
});

function expectError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body).toEqual({
    success: false,
    error: { code, message: expect.any(String) },
  });
}

test('anonymous keyword search returns only approved listings in the standard paginated shape', async () => {
  const response = await api.get('/api/v1/listings').query({ keyword });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toHaveLength(1);
  expect(response.body.data[0]).toMatchObject({
    id: listings[0],
    title: `${keyword} approved`,
    district,
    coverImageUrl: `https://example.test/${keyword}.jpg`,
  });
  expect(response.body.pagination).toEqual({ page: 1, limit: 12, total: 1 });
  expect(response.body.data[0]).not.toHaveProperty('owner_id');
  expect(response.body.data[0]).not.toHaveProperty('reviewed_by');
  expect(response.body.data[0]).not.toHaveProperty('description');
  expect(JSON.stringify(response.body)).not.toContain('Private synthetic description');
});

test('anonymous district search matches the exact district and ignores non-approved records', async () => {
  const response = await api.get('/api/v1/listings').query({ district });

  expect(response.status).toBe(200);
  expect(response.body.data.map(item => item.id)).toEqual([listings[0]]);
  expect(response.body.pagination.total).toBe(1);
});

test('invalid and unsupported query fields return a validation error without echoing values', async () => {
  const malformed = await api.get('/api/v1/listings').query({ page: '0' });
  expectError(malformed, 400, 'VALIDATION_ERROR');
  expect(JSON.stringify(malformed.body)).not.toContain('0');

  const unsupported = await api.get('/api/v1/listings').query({ ownerId: users[0] });
  expectError(unsupported, 400, 'VALIDATION_ERROR');
  expect(JSON.stringify(unsupported.body)).not.toContain(users[0]);
});

test('public filter options require no authentication and do not expose listing owners', async () => {
  const response = await api.get('/api/v1/listings/filters');

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.districts).toContain(district);
  expect(response.body.data.roomTypes.map(item => item.code)).toEqual(expect.arrayContaining([
    'apartment', 'private_room', 'shared_room', 'studio',
  ]));
  expect(response.body.data.roomTypes).toHaveLength(4);
  expect(response.body.data).not.toHaveProperty('owners');
});
