jest.mock('../src/db', () => ({ query: jest.fn() }));

const { query } = require('../src/db');
const { searchListings } = require('../src/services/listingSearchService');

function listingRow(overrides = {}) {
  return {
    id: '9007199254740993',
    title: 'Quiet room near campus',
    price: 4500000,
    area_m2: 24,
    address: '12 Sample Street',
    district: 'Bình Thạnh',
    room_type_code: 'private_room',
    room_type_name: 'Phòng trọ riêng',
    cover_image_url: 'https://example.test/cover.jpg',
    amenities: [{ id: '1', name: 'Wifi' }],
    created_at: new Date('2026-11-12T10:00:00.000Z'),
    owner_id: 'private-owner-id',
    reviewed_by: 'private-reviewer-id',
    reject_reason: 'private moderation data',
    ...overrides,
  };
}

beforeEach(() => {
  query.mockReset();
});

test('searches title, address, and district with normalized literal keyword and approved-only default results', async () => {
  query.mockResolvedValueOnce({ rows: [{ total: '1' }] })
    .mockResolvedValueOnce({ rows: [listingRow()] });

  const result = await searchListings({ keyword: '  room   50%_\\  ' });

  expect(query).toHaveBeenCalledTimes(2);
  const [countSql, countParams] = query.mock.calls[0];
  const [listingSql, listingParams] = query.mock.calls[1];
  for (const column of ['l.title', 'l.address', 'l.district']) {
    expect(countSql).toContain(column);
    expect(listingSql).toContain(column);
  }
  expect(countSql).toContain("l.status = 'approved'");
  expect(listingSql).toContain("l.status = 'approved'");
  expect(countParams).toEqual(['%room 50\\%\\_\\\\%']);
  expect(listingParams).toEqual(['%room 50\\%\\_\\\\%', 12, 0]);
  expect(listingSql).toContain('ORDER BY l.created_at DESC, l.id DESC');

  expect(result).toEqual({
    listings: [{
      id: '9007199254740993',
      title: 'Quiet room near campus',
      price: 4500000,
      areaM2: 24,
      address: '12 Sample Street',
      district: 'Bình Thạnh',
      roomType: { code: 'private_room', name: 'Phòng trọ riêng' },
      coverImageUrl: 'https://example.test/cover.jpg',
      amenities: [{ id: '1', name: 'Wifi' }],
      createdAt: '2026-11-12T10:00:00.000Z',
    }],
    pagination: { page: 1, limit: 12, total: 1 },
  });
  expect(JSON.stringify(result)).not.toContain('private-owner-id');
  expect(JSON.stringify(result)).not.toContain('private-reviewer-id');
  expect(JSON.stringify(result)).not.toContain('private moderation data');
});

test('district filtering validates an exact approved district and applies it to the result query', async () => {
  query.mockResolvedValueOnce({ rows: [{ district: 'Bình Thạnh' }] })
    .mockResolvedValueOnce({ rows: [{ total: '1' }] })
    .mockResolvedValueOnce({ rows: [listingRow()] });

  const result = await searchListings({ district: 'Bình Thạnh' });

  expect(query.mock.calls[0][0]).toContain("status = 'approved'");
  expect(query.mock.calls[0][1]).toEqual(['Bình Thạnh']);
  expect(query.mock.calls[1][0]).toContain('l.district = $1');
  expect(query.mock.calls[1][1]).toEqual(['Bình Thạnh']);
  expect(query.mock.calls[2][0]).toContain('l.district = $1');
  expect(query.mock.calls[2][1]).toEqual(['Bình Thạnh', 12, 0]);
  expect(result.pagination).toEqual({ page: 1, limit: 12, total: 1 });
});

test('combines active room type, inclusive price and area bounds, and every distinct selected amenity', async () => {
  query.mockResolvedValueOnce({ rows: [{ id: 3 }] })
    .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })
    .mockResolvedValueOnce({ rows: [{ total: '1' }] })
    .mockResolvedValueOnce({ rows: [listingRow()] });

  const result = await searchListings({
    roomType: 'studio',
    maxPrice: '5000000',
    minAreaM2: '20',
    maxAreaM2: '24',
    amenityIds: ['2', '1', '2'],
  });

  expect(query).toHaveBeenCalledTimes(4);
  expect(query.mock.calls[0][0]).toContain('is_active = true');
  expect(query.mock.calls[0][1]).toEqual(['studio']);
  expect(query.mock.calls[1][1]).toEqual([[2, 1]]);

  const [countSql, countParams] = query.mock.calls[2];
  const [resultsSql, resultsParams] = query.mock.calls[3];
  for (const sql of [countSql, resultsSql]) {
    expect(sql).toContain('rt.code = $1');
    expect(sql).toContain('l.price <= $2');
    expect(sql).toContain('l.area_m2 >= $3');
    expect(sql).toContain('l.area_m2 <= $4');
    expect(sql).toContain('COUNT(DISTINCT la.amenity_id)');
    expect(sql).toContain('l.status = \'approved\'');
  }
  expect(countParams).toEqual(['studio', 5000000, 20, 24, [2, 1], 2]);
  expect(resultsParams).toEqual(['studio', 5000000, 20, 24, [2, 1], 2, 12, 0]);
  expect(result.pagination.total).toBe(1);
});

test('rejects inactive or unsupported room types and amenities instead of ignoring them', async () => {
  query.mockResolvedValueOnce({ rows: [] });
  await expect(searchListings({ roomType: 'whole_house' })).rejects.toMatchObject({
    status: 400,
    code: 'VALIDATION_ERROR',
  });
  expect(query).toHaveBeenCalledTimes(1);

  query.mockReset();
  query.mockResolvedValueOnce({ rows: [] });
  await expect(searchListings({ amenityIds: '999' })).rejects.toMatchObject({
    status: 400,
    code: 'VALIDATION_ERROR',
  });
  expect(query).toHaveBeenCalledTimes(1);
});

test('rejects an area range whose minimum exceeds its maximum before querying', async () => {
  await expect(searchListings({ minAreaM2: '25', maxAreaM2: '24' })).rejects.toMatchObject({
    name: 'ZodError',
    issues: [expect.objectContaining({ message: 'Minimum area must not exceed maximum area' })],
  });
  expect(query).not.toHaveBeenCalled();
});

test('unfiltered search returns the first 12 records and the total matching count', async () => {
  const rows = Array.from({ length: 12 }, (_, index) => listingRow({ id: String(index + 1) }));
  query.mockResolvedValueOnce({ rows: [{ total: '17' }] }).mockResolvedValueOnce({ rows });

  const result = await searchListings({});

  expect(result.listings).toHaveLength(12);
  expect(result.pagination).toEqual({ page: 1, limit: 12, total: 17 });
  expect(query.mock.calls[1][1]).toEqual([12, 0]);
});

test('unsupported district values are rejected rather than ignored', async () => {
  query.mockResolvedValueOnce({ rows: [] });

  await expect(searchListings({ district: 'Unsupported District' })).rejects.toMatchObject({
    status: 400,
    code: 'VALIDATION_ERROR',
  });
  expect(query).toHaveBeenCalledTimes(1);
});

test.each([
  [{ page: '0' }],
  [{ page: '1.5' }],
  [{ page: '1', extra: 'unsupported' }],
  [{ keyword: 123 }],
  [{ maxPrice: 'not-a-number' }],
  [{ minAreaM2: '0' }],
  [{ maxAreaM2: 'Infinity' }],
  [{ amenityIds: ['1', 'invalid'] }],
])('rejects malformed or unsupported search parameters before querying', async criteria => {
  await expect(searchListings(criteria)).rejects.toBeInstanceOf(Error);
  expect(query).not.toHaveBeenCalled();
});

test.each([0, 1])('preserves database errors from search query %i instead of returning empty results', async failureIndex => {
  const databaseError = new Error('Synthetic database failure');
  if (failureIndex === 0) {
    query.mockRejectedValueOnce(databaseError);
  } else {
    query.mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockRejectedValueOnce(databaseError);
  }

  await expect(searchListings({})).rejects.toBe(databaseError);
  expect(query).toHaveBeenCalledTimes(failureIndex + 1);
});
