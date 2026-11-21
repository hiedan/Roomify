const { assertTestTarget } = require('../src/databaseConfig');
const request = require('supertest');
const { randomUUID } = require('node:crypto');
const { createApp } = require('../src/app');
const { query } = require('../src/db');
const auth = require('../src/services/authService');
jest.setTimeout(20000);

const api = request(createApp());
const userIds = [];
const listingIds = [];

let landlordToken;
let landlordId;
let otherLandlordToken;
let otherLandlordId;
let tenantToken;
let tenantId;
let sampleRoomTypeId;

beforeAll(async () => {
  assertTestTarget();
  // Get an active room type ID from seeded room_types
  const rtRes = await query('SELECT id FROM room_types WHERE code = $1', ['private_room']);
  sampleRoomTypeId = rtRes.rows[0] ? rtRes.rows[0].id : 1;
});

beforeEach(async () => {
  const landlordRes = await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ('Integration Landlord', $1, 'fixture-hash', 'landlord', true)
     RETURNING id, full_name, email, role, is_active`,
    [`landlord-${randomUUID()}@example.test`]
  );
  landlordId = String(landlordRes.rows[0].id);
  userIds.push(landlordId);
  landlordToken = auth.issueToken(landlordRes.rows[0], false).token;

  const otherLandlordRes = await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ('Other Landlord', $1, 'fixture-hash', 'landlord', true)
     RETURNING id, full_name, email, role, is_active`,
    [`other-${randomUUID()}@example.test`]
  );
  otherLandlordId = String(otherLandlordRes.rows[0].id);
  userIds.push(otherLandlordId);
  otherLandlordToken = auth.issueToken(otherLandlordRes.rows[0], false).token;

  const tenantRes = await query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ('Integration Tenant', $1, 'fixture-hash', 'tenant', true)
     RETURNING id, full_name, email, role, is_active`,
    [`tenant-${randomUUID()}@example.test`]
  );
  tenantId = String(tenantRes.rows[0].id);
  userIds.push(tenantId);
  tenantToken = auth.issueToken(tenantRes.rows[0], false).token;
});

afterEach(async () => {
  if (listingIds.length) {
    await query('DELETE FROM listings WHERE id = ANY($1::bigint[])', [listingIds]);
    listingIds.length = 0;
  }
  if (userIds.length) {
    await query('DELETE FROM users WHERE id = ANY($1::bigint[])', [userIds]);
    userIds.length = 0;
  }
});

function expectError(response, status, code) {
  expect(response.status).toBe(status);
  expect(response.body).toEqual({
    success: false,
    error: { code, message: expect.any(String) },
  });
}

describe('POST /api/v1/listings (UC-13, UC-14)', () => {
  test('rejects unauthenticated request with 401', async () => {
    const res = await api.post('/api/v1/listings').send({ title: 'Test Room' });
    expectError(res, 401, 'UNAUTHORIZED');
  });

  test('rejects tenant role with 403', async () => {
    const res = await api
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ title: 'Test Room' });
    expectError(res, 403, 'FORBIDDEN');
  });

  test('rejects invalid payload with 400', async () => {
    const res = await api
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        title: 'Room', // < 5 chars
        price: -100,
        areaM2: 0,
        address: '123',
        district: 'Q1',
        lat: 100,
        lng: 200,
        roomTypeId: 99999,
        imageUrls: [],
      });
    expectError(res, 400, 'VALIDATION_ERROR');
  });

  test('creates new listing in pending status with PostGIS point (lng, lat) and images', async () => {
    const payload = {
      title: 'Phòng trọ cao cấp gần ĐH Bách Khoa TP.HCM',
      description: 'Phòng mới xây ban công thoáng mát.',
      price: 3500000,
      areaM2: 25.5,
      address: '268 Lý Thường Kiệt, Phường 14',
      district: 'Quận 10',
      lat: 10.772583,
      lng: 106.657806,
      roomTypeId: sampleRoomTypeId,
      amenityIds: [1, 2],
      imageUrls: [
        'https://example.com/photos/room-main.jpg',
        'https://example.com/photos/room-bath.jpg',
      ],
    };

    const res = await api
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.id).toBeDefined();
    listingIds.push(data.id);

    expect(data.ownerId).toBe(landlordId);
    expect(data.title).toBe(payload.title);
    expect(data.price).toBe(payload.price);
    expect(data.areaM2).toBe(payload.areaM2);
    expect(data.status).toBe('pending');
    expect(data.rejectReason).toBeNull();
    expect(data.coverImageUrl).toBe(payload.imageUrls[0]);
    expect(data.images).toHaveLength(2);
    expect(data.images[0].isCover).toBe(true);
    expect(data.images[1].isCover).toBe(false);

    // Verify PostGIS geom point in database (lng, lat)
    const dbCheck = await query(
      'SELECT ST_X(geom::geometry) AS lng, ST_Y(geom::geometry) AS lat, status FROM listings WHERE id = $1',
      [data.id]
    );
    expect(dbCheck.rows[0].status).toBe('pending');
    expect(Number(dbCheck.rows[0].lng)).toBeCloseTo(payload.lng, 4);
    expect(Number(dbCheck.rows[0].lat)).toBeCloseTo(payload.lat, 4);
  });
});

describe('GET /api/v1/listings/mine (UC-15)', () => {
  beforeEach(async () => {
    // Seed 1 pending, 1 approved, 1 rejected for landlord
    const p1 = await query(
      `INSERT INTO listings (owner_id, title, description, price, area_m2, address, district, lat, lng, geom, status, room_type_id)
       VALUES ($1, 'Pending Room', 'Desc', 3000000, 20, '123 St', 'Q10', 10.7, 106.6, ST_SetSRID(ST_MakePoint(106.6, 10.7), 4326)::geography, 'pending', $2)
       RETURNING id`,
      [landlordId, sampleRoomTypeId]
    );
    listingIds.push(p1.rows[0].id);

    const p2 = await query(
      `INSERT INTO listings (owner_id, title, description, price, area_m2, address, district, lat, lng, geom, status, room_type_id)
       VALUES ($1, 'Approved Room', 'Desc', 4000000, 25, '124 St', 'Q10', 10.7, 106.6, ST_SetSRID(ST_MakePoint(106.6, 10.7), 4326)::geography, 'approved', $2)
       RETURNING id`,
      [landlordId, sampleRoomTypeId]
    );
    listingIds.push(p2.rows[0].id);

    const p3 = await query(
      `INSERT INTO listings (owner_id, title, description, price, area_m2, address, district, lat, lng, geom, status, reject_reason, room_type_id)
       VALUES ($1, 'Rejected Room', 'Desc', 5000000, 30, '125 St', 'Q10', 10.7, 106.6, ST_SetSRID(ST_MakePoint(106.6, 10.7), 4326)::geography, 'rejected', 'Ảnh phòng bị mờ', $2)
       RETURNING id`,
      [landlordId, sampleRoomTypeId]
    );
    listingIds.push(p3.rows[0].id);

    // Seed 1 listing for other landlord
    const p4 = await query(
      `INSERT INTO listings (owner_id, title, description, price, area_m2, address, district, lat, lng, geom, status, room_type_id)
       VALUES ($1, 'Other Room', 'Desc', 3500000, 22, '126 St', 'Q1', 10.7, 106.6, ST_SetSRID(ST_MakePoint(106.6, 10.7), 4326)::geography, 'approved', $2)
       RETURNING id`,
      [otherLandlordId, sampleRoomTypeId]
    );
    listingIds.push(p4.rows[0].id);
  });

  test('returns landlord listings and summary counts in standard envelope without other landlord data', async () => {
    const res = await api
      .get('/api/v1/listings/mine')
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toEqual({
      total: 3,
      pending: 1,
      approved: 1,
      rejected: 1,
    });
    expect(res.body.data.listings).toHaveLength(3);
    for (const item of res.body.data.listings) {
      expect(item.ownerId).toBe(landlordId);
    }
  });

  test('filters by status=rejected and displays rejection reason', async () => {
    const res = await api
      .get('/api/v1/listings/mine?status=rejected')
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.listings).toHaveLength(1);
    expect(res.body.data.listings[0].status).toBe('rejected');
    expect(res.body.data.listings[0].rejectReason).toBe('Ảnh phòng bị mờ');
  });

  test('GET /api/v1/listings/mine/:id returns full detail for owned listing', async () => {
    const targetId = listingIds[2]; // the rejected one
    const res = await api
      .get(`/api/v1/listings/mine/${targetId}`)
      .set('Authorization', `Bearer ${landlordToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(String(targetId));
    expect(res.body.data.rejectReason).toBe('Ảnh phòng bị mờ');

    // Forbidden for other landlord
    const forbiddenRes = await api
      .get(`/api/v1/listings/mine/${targetId}`)
      .set('Authorization', `Bearer ${otherLandlordToken}`);
    expectError(forbiddenRes, 403, 'FORBIDDEN');
  });
});

describe('PATCH /api/v1/listings/:id (UC-16)', () => {
  let listingId;
  beforeEach(async () => {
    const p = await query(
      `INSERT INTO listings (owner_id, title, description, price, area_m2, address, district, lat, lng, geom, status, reject_reason, room_type_id)
       VALUES ($1, 'Approved Studio', 'Original Desc', 4000000, 28, '100 Main St', 'Q3', 10.78, 106.69, ST_SetSRID(ST_MakePoint(106.69, 10.78), 4326)::geography, 'approved', NULL, $2)
       RETURNING id`,
      [landlordId, sampleRoomTypeId]
    );
    listingId = String(p.rows[0].id);
    listingIds.push(listingId);
  });

  test('rejects update from non-owner with 403', async () => {
    const res = await api
      .patch(`/api/v1/listings/${listingId}`)
      .set('Authorization', `Bearer ${otherLandlordToken}`)
      .send({ price: 4500000 });
    expectError(res, 403, 'FORBIDDEN');
  });

  test('substantive update resets status to pending and clears reject_reason', async () => {
    const res = await api
      .patch(`/api/v1/listings/${listingId}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ price: 4200000, areaM2: 30.0 });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(4200000);
    expect(res.body.data.areaM2).toBe(30.0);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.rejectReason).toBeNull();

    // Verify database row
    const dbRes = await query('SELECT status, reject_reason, price FROM listings WHERE id = $1', [listingId]);
    expect(dbRes.rows[0].status).toBe('pending');
    expect(dbRes.rows[0].reject_reason).toBeNull();
    expect(dbRes.rows[0].price).toBe(4200000);
  });
});

describe('DELETE /api/v1/listings/:id (UC-17)', () => {
  let listingId;
  beforeEach(async () => {
    const p = await query(
      `INSERT INTO listings (owner_id, title, description, price, area_m2, address, district, lat, lng, geom, status, room_type_id)
       VALUES ($1, 'Listing to Delete', 'Desc', 3000000, 20, '101 St', 'Q1', 10.7, 106.6, ST_SetSRID(ST_MakePoint(106.6, 10.7), 4326)::geography, 'approved', $2)
       RETURNING id`,
      [landlordId, sampleRoomTypeId]
    );
    listingId = String(p.rows[0].id);
    listingIds.push(listingId);

    await query('INSERT INTO listing_images (listing_id, url, is_cover) VALUES ($1, $2, true)', [listingId, 'https://example.com/delete.jpg']);
    await query('INSERT INTO listing_amenities (listing_id, amenity_id) VALUES ($1, 1)', [listingId]);
  });

  test('rejects delete from non-owner with 403', async () => {
    const res = await api
      .delete(`/api/v1/listings/${listingId}`)
      .set('Authorization', `Bearer ${otherLandlordToken}`)
      .send({});
    expectError(res, 403, 'FORBIDDEN');
  });

  test('deletes owned listing and cascades child rows', async () => {
    const res = await api
      .delete(`/api/v1/listings/${listingId}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: listingId, deleted: true });

    const listingCheck = await query('SELECT id FROM listings WHERE id = $1', [listingId]);
    expect(listingCheck.rows).toHaveLength(0);

    const imagesCheck = await query('SELECT id FROM listing_images WHERE listing_id = $1', [listingId]);
    expect(imagesCheck.rows).toHaveLength(0);

    const amenitiesCheck = await query('SELECT listing_id FROM listing_amenities WHERE listing_id = $1', [listingId]);
    expect(amenitiesCheck.rows).toHaveLength(0);
  });
});
