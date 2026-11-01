const request = require('supertest');
const { createApp } = require('../src/app');
const { query } = require('../src/db');
const { resetDb } = require('./helpers');
const api = request(createApp());
beforeEach(resetDb);

test('public map only exposes approved listings with pagination and safe fields', async () => {
  const owner = await query("INSERT INTO users (full_name, email, password_hash, role) VALUES ('Owner', 'owner@gmail.com', 'test-only', 'landlord') RETURNING id");
  for (const status of ['approved', 'approved', 'pending', 'rejected']) {
    await query(
      `INSERT INTO listings (owner_id, title, price, area_m2, address, district, lat, lng, geom, status)
       VALUES ($1, $2, 2500000, 20, 'Test address', 'Thu Duc', 10.8, 106.7,
       ST_SetSRID(ST_MakePoint(106.7, 10.8),4326)::geography, $3)`,
      [owner.rows[0].id, status, status]
    );
  }
  const response = await api.get('/api/v1/listings?page=1&limit=1');
  expect(response.status).toBe(200);
  expect(response.body.error).toBeNull();
  expect(response.body.pagination).toEqual({ page: 1, limit: 1, total: 2 });
  expect(response.body.data).toHaveLength(1);
  expect(response.body.data[0]).toEqual({ id: expect.any(String), title: 'approved', price: 2500000, areaM2: 20, address: 'Test address', district: 'Thu Duc', lat: 10.8, lng: 106.7 });
  const second = await api.get('/api/v1/listings?page=2&limit=1');
  expect(second.body.data[0].id).not.toBe(response.body.data[0].id);
  const empty = await api.get('/api/v1/listings?page=3&limit=1');
  expect(empty.body.data).toEqual([]);
  expect(empty.body.pagination.total).toBe(2);
});
test('empty database returns an empty page', async () => {
  const res = await api.get('/api/v1/listings');
  expect(res.body.data).toEqual([]);
  expect(res.body.pagination.total).toBe(0);
});
test.each(['page=0', 'page=1.5', 'limit=51', 'limit=0', 'page=abc', 'status=pending'])('invalid query %s returns 400', async (queryString) => {
  const res = await api.get('/api/v1/listings?' + queryString);
  expect(res.status).toBe(400);
  expect(res.body.data).toBeNull();
});
