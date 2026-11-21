jest.mock('../src/db', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

const { pool } = require('../src/db');
const {
  createListing,
  getLandlordListings,
  getLandlordListingById,
  updateOwnedListing,
  deleteOwnedListing,
} = require('../src/services/listingService');
const {
  validLandlord,
  validListingInput,
  createSyntheticListingRow,
} = require('./fixtures/listingFixtures');

let client;

beforeEach(() => {
  jest.clearAllMocks();
  client = {
    query: jest.fn(async sql => {
      if (sql.startsWith('SELECT role')) return { rows: [{ role: 'landlord', is_active: true }] };
      if (sql.startsWith('SELECT owner_id')) return { rows: [{ owner_id: validLandlord.id }] };
      if (sql.startsWith('DELETE')) return { rows: [{ id: '101' }] };
      return { rows: [] };
    }),
    release: jest.fn(),
  };
  pool.connect.mockResolvedValue(client);
  pool.query.mockResolvedValue({ rows: [] });
});

describe('deleteOwnedListing', () => {
  test('rollback failure preserves the original database error and discards the connection', async () => {
    const original = new Error('Synthetic delete failure');
    const broken = new Error('Synthetic rollback failure');
    const normal = client.query.getMockImplementation();
    client.query.mockImplementation(async sql => {
      if (sql.startsWith('DELETE')) throw original;
      if (sql === 'ROLLBACK') throw broken;
      return normal(sql);
    });
    await expect(deleteOwnedListing(validLandlord.id, '101')).rejects.toBe(original);
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
    await expect(deleteOwnedListing(validLandlord.id, '101')).rejects.toBe(original);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledWith(undefined);
  });

  test('connection checkout error retains its meaning without trying to release a nonexistent client', async () => {
    const original = new Error('Synthetic connection failure');
    pool.connect.mockRejectedValue(original);
    await expect(deleteOwnedListing(validLandlord.id, '101')).rejects.toBe(original);
    expect(client.query).not.toHaveBeenCalled();
    expect(client.release).not.toHaveBeenCalled();
  });

  test('an unexpected empty conditional DELETE is rolled back instead of returning false success', async () => {
    const normal = client.query.getMockImplementation();
    client.query.mockImplementation(sql => (sql.startsWith('DELETE') ? { rows: [] } : normal(sql)));
    await expect(deleteOwnedListing(validLandlord.id, '101')).rejects.toThrow('did not return a row');
    expect(client.query).toHaveBeenCalledWith(
      'DELETE FROM listings WHERE id = $1 AND owner_id = $2 RETURNING id', ['101', validLandlord.id]
    );
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});

describe('createListing', () => {
  test('rejects invalid inputs such as 0 images, coordinates out of range, or non-positive price', async () => {
    await expect(createListing(validLandlord.id, { ...validListingInput, imageUrls: [] }))
      .rejects.toThrow('At least 1 photo is required');

    await expect(createListing(validLandlord.id, { ...validListingInput, lat: 95.0 }))
      .rejects.toThrow('Latitude must be between -90 and 90');

    await expect(createListing(validLandlord.id, { ...validListingInput, lng: -190.0 }))
      .rejects.toThrow('Longitude must be between -180 and 180');

    await expect(createListing(validLandlord.id, { ...validListingInput, price: -500000 }))
      .rejects.toThrow('Price must be a positive integer in VND');
  });

  test('rejects unauthenticated user or invalid actor ID', async () => {
    await expect(createListing('invalid-id', validListingInput)).rejects.toThrow('Authentication is required');
  });

  test('rejects non-landlord or inactive user during transaction check', async () => {
    client.query.mockImplementation(async sql => {
      if (sql.startsWith('SELECT role')) return { rows: [{ role: 'tenant', is_active: true }] };
      return { rows: [] };
    });
    await expect(createListing(validLandlord.id, validListingInput)).rejects.toThrow('Landlord access is required');

    client.query.mockImplementation(async sql => {
      if (sql.startsWith('SELECT role')) return { rows: [{ role: 'landlord', is_active: false }] };
      return { rows: [] };
    });
    await expect(createListing(validLandlord.id, validListingInput)).rejects.toThrow('Account is inactive');
  });

  test('rejects invalid or inactive room type', async () => {
    client.query.mockImplementation(async sql => {
      if (sql.startsWith('SELECT role')) return { rows: [{ role: 'landlord', is_active: true }] };
      if (sql.includes('FROM room_types')) return { rows: [] };
      return { rows: [] };
    });
    await expect(createListing(validLandlord.id, validListingInput)).rejects.toThrow('Invalid or inactive room type');
  });

  test('successfully creates listing with PostGIS point (lng, lat) and sets status to pending', async () => {
    const listingRow = createSyntheticListingRow();
    client.query.mockImplementation(async (sql, params) => {
      if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT')) return { rows: [] };
      if (sql.startsWith('SELECT role')) return { rows: [{ role: 'landlord', is_active: true }] };
      if (sql.includes('FROM room_types')) {
        return { rows: [{ id: 1, code: 'private_room', name: 'Phòng trọ riêng' }] };
      }
      if (sql.includes('FROM amenities')) {
        return {
          rows: [
            { id: 1, name: 'Máy lạnh', icon: 'ac' },
            { id: 2, name: 'Wifi', icon: 'wifi' },
            { id: 3, name: 'Chỗ để xe', icon: 'parking' },
          ],
        };
      }
      if (sql.includes('INSERT INTO listings')) {
        return { rows: [listingRow] };
      }
      if (sql.includes('INSERT INTO listing_images')) {
        return { rows: [{ id: '201', url: params[1], is_cover: params[2], sort_order: params[3] }] };
      }
      if (sql.includes('INSERT INTO listing_amenities')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await createListing(validLandlord.id, validListingInput);

    expect(result.id).toBe('101');
    expect(result.ownerId).toBe(validLandlord.id);
    expect(result.status).toBe('pending');
    expect(result.rejectReason).toBeNull();
    expect(result.areaM2).toBe(25.5);
    expect(result.roomType).toEqual({ id: 1, code: 'private_room', name: 'Phòng trọ riêng' });
    expect(result.coverImageUrl).toBe('https://example.com/photos/room-main.jpg');
    expect(result.images).toHaveLength(2);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });
});

describe('getLandlordListings and getLandlordListingById', () => {
  test('getLandlordListings returns listings and summary counts scoped to actorId', async () => {
    pool.query.mockImplementation(async (sql, _params) => {
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ total: 3, pending: 1, approved: 1, rejected: 1 }] };
      }
      if (sql.includes('FROM listings l')) {
        return {
          rows: [
            {
              id: '101',
              owner_id: validLandlord.id,
              title: 'Listing 1',
              description: 'Desc 1',
              price: 3000000,
              area_m2: 20,
              address: '123 St',
              district: 'Q1',
              lat: 10.123456,
              lng: 106.123456,
              status: 'pending',
              reject_reason: null,
              created_at: new Date('2026-11-20T00:00:00Z'),
              room_type_id: 1,
              room_type_code: 'private_room',
              room_type_name: 'Phòng trọ riêng',
            },
          ],
        };
      }
      if (sql.includes('FROM listing_images')) {
        return {
          rows: [
            { id: '1', listing_id: '101', url: 'https://example.com/1.jpg', is_cover: true, sort_order: 0 },
          ],
        };
      }
      if (sql.includes('FROM listing_amenities')) {
        return {
          rows: [
            { listing_id: '101', id: 1, name: 'Wifi', icon: 'wifi' },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await getLandlordListings(validLandlord.id, { status: 'all' });
    expect(result.summary).toEqual({ total: 3, pending: 1, approved: 1, rejected: 1 });
    expect(result.listings).toHaveLength(1);
    expect(result.listings[0].id).toBe('101');
    expect(result.listings[0].coverImageUrl).toBe('https://example.com/1.jpg');
    expect(result.listings[0].amenities[0].name).toBe('Wifi');
  });

  test('getLandlordListingById throws 404 for missing listing and 403 for non-owner', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(getLandlordListingById(validLandlord.id, '999')).rejects.toThrow('Listing not found');

    pool.query.mockResolvedValueOnce({ rows: [{ id: '101', owner_id: 'other-user' }] });
    await expect(getLandlordListingById(validLandlord.id, '101')).rejects.toThrow('Listing ownership is required');
  });
});

describe('updateOwnedListing', () => {
  test('detects no-op changes and preserves current status and rejection reason', async () => {
    const existing = createSyntheticListingRow({
      status: 'approved',
      reject_reason: null,
      area_m2: 25.5,
    });
    client.query.mockImplementation(async sql => {
      if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT')) return { rows: [] };
      if (sql.startsWith('SELECT role')) return { rows: [{ role: 'landlord', is_active: true }] };
      if (sql.includes('FROM listings WHERE id = $1 FOR UPDATE')) {
        return { rows: [existing] };
      }
      if (sql.includes('FROM listing_amenities')) {
        return { rows: [{ amenity_id: 1 }] };
      }
      if (sql.includes('FROM listing_images')) {
        return { rows: [{ url: 'https://example.com/img.jpg' }] };
      }
      return { rows: [] };
    });

    pool.query.mockImplementation(async sql => {
      if (sql.includes('FROM listings l')) return { rows: [existing] };
      if (sql.includes('FROM listing_images')) return { rows: [] };
      if (sql.includes('FROM listing_amenities')) return { rows: [] };
      return { rows: [] };
    });

    // Send payload matching existing exactly
    const result = await updateOwnedListing(validLandlord.id, '101', {
      title: existing.title,
    });
    expect(result.status).toBe('approved');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  test('substantive update automatically resets status to pending and clears reject_reason', async () => {
    const existing = createSyntheticListingRow({
      status: 'rejected',
      reject_reason: 'Prior rejection reason',
    });
    client.query.mockImplementation(async (sql, _params) => {
      if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT')) return { rows: [] };
      if (sql.startsWith('SELECT role')) return { rows: [{ role: 'landlord', is_active: true }] };
      if (sql.includes('FROM listings WHERE id = $1 FOR UPDATE')) {
        return { rows: [existing] };
      }
      if (sql.includes('FROM listing_amenities')) return { rows: [] };
      if (sql.includes('FROM listing_images')) return { rows: [] };
      if (sql.includes('UPDATE listings')) {
        expect(sql).toContain("status = 'pending'");
        expect(sql).toContain('reject_reason = NULL');
        return { rows: [{ id: '101' }] };
      }
      return { rows: [] };
    });

    pool.query.mockImplementation(async sql => {
      if (sql.includes('FROM listings l')) {
        return {
          rows: [{
            ...existing,
            price: 4000000,
            status: 'pending',
            reject_reason: null,
          }],
        };
      }
      if (sql.includes('FROM listing_images')) return { rows: [] };
      if (sql.includes('FROM listing_amenities')) return { rows: [] };
      return { rows: [] };
    });

    const result = await updateOwnedListing(validLandlord.id, '101', { price: 4000000 });
    expect(result.status).toBe('pending');
    expect(result.rejectReason).toBeNull();
  });
});
