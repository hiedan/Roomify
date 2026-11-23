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

test('province and ward filters match verified codes and exclude unclassified listings', async () => {
  await query('UPDATE listings SET province_code = $1, ward_code = $2 WHERE id = $3',
    ['01', '00004', listings[0]]);

  const matching = await api.get('/api/v1/listings').query({ keyword, provinceCode: '01', wardCode: '00004' });
  expect(matching.status).toBe(200);
  expect(matching.body.data).toHaveLength(1);
  expect(matching.body.data[0]).toMatchObject({ provinceCode: '01', wardCode: '00004' });

  const otherProvince = await api.get('/api/v1/listings').query({ keyword, provinceCode: '79' });
  expect(otherProvince.status).toBe(200);
  expect(otherProvince.body.data).toHaveLength(0);

  const invalidPair = await api.get('/api/v1/listings').query({ provinceCode: '79', wardCode: '00004' });
  expectError(invalidPair, 400, 'VALIDATION_ERROR');
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
  const amenity = await query('SELECT id FROM amenities WHERE name = $1', ['Wifi']);
  await query('INSERT INTO listing_amenities (listing_id, amenity_id) VALUES ($1, $2)',
    [listings[0], amenity.rows[0].id]);

  const response = await api.get('/api/v1/listings/filters');

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.districts).toContain(district);
  expect(response.body.data.provinces).toHaveLength(34);
  expect(response.body.data.provinces.find(item => item.code === '01').wards)
    .toContainEqual({ code: '00004', name: 'Phường Ba Đình' });
  expect(response.body.data.roomTypes.map(item => item.code)).toEqual(expect.arrayContaining([
    'apartment', 'private_room', 'shared_room', 'studio',
  ]));
  expect(response.body.data.roomTypes).toHaveLength(4);
  expect(response.body.data.amenities).toContainEqual({
    id: String(amenity.rows[0].id),
    name: 'Wifi',
  });
  expect(response.body.data.amenities).toHaveLength(8);
  expect(response.body.data).not.toHaveProperty('owners');
});

test('combined filters return only approved listings matching every selected criterion', async () => {
  const roomType = await query('SELECT id FROM room_types WHERE code = $1', ['studio']);
  const otherRoomType = await query('SELECT id FROM room_types WHERE code = $1', ['apartment']);
  const amenityRows = await query('SELECT id, name FROM amenities WHERE name = ANY($1::varchar[])',
    [['Wifi', 'Chỗ để xe']]);
  const amenitiesByName = new Map(amenityRows.rows.map(row => [row.name, row.id]));

  async function addListing(label, options = {}) {
    const listing = await query(
      `INSERT INTO listings
        (owner_id, title, description, price, area_m2, address, district, lat, lng, geom, status, room_type_id)
       VALUES ($1, $2, 'Synthetic filter fixture', $3, $4, 'Filter Test Street', $5, 10, 106,
         ST_SetSRID(ST_MakePoint(106, 10), 4326)::geography, $6, $7)
       RETURNING id`,
      [
        users[0],
        `${keyword} ${label}`,
        options.price ?? 4500000,
        options.area ?? 20,
        district,
        options.status ?? 'approved',
        options.roomTypeId ?? roomType.rows[0].id,
      ]
    );
    listings.push(listing.rows[0].id);
    for (const amenityName of options.amenities ?? []) {
      await query('INSERT INTO listing_amenities (listing_id, amenity_id) VALUES ($1, $2)',
        [listing.rows[0].id, amenitiesByName.get(amenityName)]);
    }
    return listing.rows[0].id;
  }

  const matchingId = await addListing('matching-boundaries', {
    price: 5000000,
    area: 20,
    amenities: ['Wifi', 'Chỗ để xe'],
  });
  await addListing('wrong-room-type', { roomTypeId: otherRoomType.rows[0].id, amenities: ['Wifi', 'Chỗ để xe'] });
  await addListing('above-maximum-price', { price: 5000001, amenities: ['Wifi', 'Chỗ để xe'] });
  await addListing('below-minimum-area', { area: 19.99, amenities: ['Wifi', 'Chỗ để xe'] });
  await addListing('missing-required-amenity', { amenities: ['Wifi'] });
  await addListing('not-approved', { status: 'pending', amenities: ['Wifi', 'Chỗ để xe'] });

  const response = await api.get('/api/v1/listings').query({
    keyword,
    roomType: 'studio',
    maxPrice: '5000000',
    minAreaM2: '20',
    maxAreaM2: '20',
    amenityIds: [amenitiesByName.get('Wifi'), amenitiesByName.get('Chỗ để xe')],
  });

  expect(response.status).toBe(200);
  expect(response.body.data.map(item => item.id)).toEqual([matchingId]);
  expect(response.body.pagination.total).toBe(1);
}, 60000);

test('unsupported room types and amenity identifiers return validation errors', async () => {
  const unsupportedRoomType = await api.get('/api/v1/listings').query({ roomType: 'whole_house' });
  expectError(unsupportedRoomType, 400, 'VALIDATION_ERROR');

  const unsupportedAmenity = await api.get('/api/v1/listings').query({ amenityIds: '999999' });
  expectError(unsupportedAmenity, 400, 'VALIDATION_ERROR');
});

test.each([
  [{ minAreaM2: '25', maxAreaM2: '20' }],
  [{ maxPrice: 'not-a-price' }],
  [{ minAreaM2: '0' }],
  [{ roomType: 'whole_house' }],
  [{ amenityIds: 'not-an-id' }],
  [{ unsupportedFilter: 'value' }],
])('malformed, unsupported, or contradictory criteria return the standard validation response: %j', async criteria => {
  const response = await api.get('/api/v1/listings').query(criteria);
  expectError(response, 400, 'VALIDATION_ERROR');
});

test('search returns stable 12-item pages, total count, and only public summary fields', async () => {
  const timestamp = '2020-01-01T00:00:00.000Z';
  const seeded = await query(
    `INSERT INTO listings
      (owner_id, title, description, price, area_m2, address, district, lat, lng, geom, status, created_at)
     SELECT $1, $2 || '-' || generated.id, 'Pagination private description', 4500000, 24,
       'Pagination Street', $3, 10, 106,
       ST_SetSRID(ST_MakePoint(106, 10), 4326)::geography, 'approved', $4::timestamptz
     FROM generate_series(1, 13) AS generated(id)
     RETURNING id`,
    [users[0], `${keyword}-page`, district, timestamp]
  );
  const seededIds = seeded.rows.map(row => row.id);
  listings.push(...seededIds);

  const firstPage = await api.get('/api/v1/listings').query({ keyword });
  const secondPage = await api.get('/api/v1/listings').query({ keyword, page: '2' });

  expect(firstPage.status).toBe(200);
  expect(firstPage.body.data).toHaveLength(12);
  expect(firstPage.body.pagination).toEqual({ page: 1, limit: 12, total: 14 });
  expect(firstPage.body.data.map(item => item.id)).toEqual([
    listings[0],
    ...seededIds.slice().sort((left, right) => BigInt(right) > BigInt(left) ? 1 : -1).slice(0, 11),
  ]);
  expect(secondPage.status).toBe(200);
  expect(secondPage.body.data).toHaveLength(2);
  expect(secondPage.body.pagination).toEqual({ page: 2, limit: 12, total: 14 });
  expect(secondPage.body.data.map(item => item.id)).toEqual(
    seededIds.slice().sort((left, right) => BigInt(right) > BigInt(left) ? 1 : -1).slice(11)
  );
  expect(JSON.stringify([...firstPage.body.data, ...secondPage.body.data]))
    .not.toContain('Pagination private description');
  for (const result of firstPage.body.data) {
    expect(result).not.toHaveProperty('owner_id');
    expect(result).not.toHaveProperty('reviewed_by');
    expect(result).not.toHaveProperty('reject_reason');
  }
}, 60000);

test('approved detail is public while pending and rejected listings return indistinguishable 404s', async () => {
  const approved = await api.get(`/api/v1/listings/${listings[0]}`);

  expect(approved.status).toBe(200);
  expect(approved.body.success).toBe(true);
  expect(approved.body.data).toMatchObject({
    id: listings[0],
    title: `${keyword} approved`,
    description: 'Private synthetic description',
    district,
    images: [{ url: `https://example.test/${keyword}.jpg`, isCover: true }],
  });
  expect(approved.body.data.amenities).toEqual([]);
  expect(approved.body.data).not.toHaveProperty('owner_id');
  expect(approved.body.data).not.toHaveProperty('ownerId');
  expect(approved.body.data).not.toHaveProperty('reviewed_by');
  expect(approved.body.data).not.toHaveProperty('reject_reason');

  for (const listingId of [listings[1], listings[2]]) {
    const response = await api.get(`/api/v1/listings/${listingId}`);
    expectError(response, 404, 'NOT_FOUND');
  }

  const malformed = await api.get('/api/v1/listings/not-a-listing-id');
  expectError(malformed, 400, 'VALIDATION_ERROR');
}, 60000);
