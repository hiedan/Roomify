const { z } = require('zod');
const { query } = require('../db');
const AppError = require('../utils/AppError');
const provinces = require('../../../shared/vietnam-administrative-units.json');
const provinceByCode = new Map(provinces.map(province => [province.code, province]));

const PAGE_SIZE = 12;
const searchQuerySchema = z.object({
  keyword: z.string().max(200).optional(),
  district: z.string().trim().min(1).max(100).optional(),
  provinceCode: z.string().regex(/^\d{2}$/).optional(),
  wardCode: z.string().regex(/^\d{5}$/).optional(),
  roomType: z.string().trim().min(1).max(30).optional(),
  maxPrice: z.coerce.number().int().min(1).max(2147483647).optional(),
  minAreaM2: z.coerce.number().positive().finite().optional(),
  maxAreaM2: z.coerce.number().positive().finite().optional(),
  amenityIds: z.preprocess(
    value => value === undefined ? [] : Array.isArray(value) ? value : [value],
    z.array(z.coerce.number().int().min(1).max(2147483647))
      .transform(ids => [...new Set(ids)])
  ),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict().superRefine(({ minAreaM2, maxAreaM2, provinceCode, wardCode }, context) => {
  if (minAreaM2 !== undefined && maxAreaM2 !== undefined && minAreaM2 > maxAreaM2) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['minAreaM2'],
      message: 'Minimum area must not exceed maximum area',
    });
  }
  if (wardCode && !provinceCode) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['provinceCode'], message: 'Province is required for a ward' });
  }
});
const listingIdSchema = z.string().regex(/^[1-9]\d{0,18}$/)
  .refine(id => /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n);

function normalizeKeyword(keyword) {
  const normalized = keyword?.trim().replace(/\s+/g, ' ');
  return normalized || undefined;
}

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function publicListing(row) {
  return {
    id: String(row.id),
    title: row.title,
    price: Number(row.price),
    areaM2: Number(row.area_m2),
    address: row.address,
    district: row.district,
    provinceCode: row.province_code || null,
    wardCode: row.ward_code || null,
    roomType: row.room_type_code
      ? { code: row.room_type_code, name: row.room_type_name }
      : null,
    coverImageUrl: row.cover_image_url || null,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function getListingFilterOptions() {
  const [districts, roomTypes, amenities] = await Promise.all([
    query(`SELECT DISTINCT district
      FROM listings
      WHERE status = 'approved'
      ORDER BY district`),
    query(`SELECT code, name
      FROM room_types
      WHERE is_active = true
      ORDER BY name, code`),
    query('SELECT id, name FROM amenities ORDER BY name, id'),
  ]);
  return {
    districts: districts.rows.map(row => row.district),
    provinces,
    roomTypes: roomTypes.rows.map(row => ({ code: row.code, name: row.name })),
    amenities: amenities.rows.map(row => ({ id: String(row.id), name: row.name })),
  };
}

async function searchListings(input) {
  const parsed = searchQuerySchema.parse(input);
  const keyword = normalizeKeyword(parsed.keyword);
  const province = parsed.provinceCode && provinceByCode.get(parsed.provinceCode);
  if (parsed.provinceCode && !province) {
    throw new AppError(400, 'VALIDATION_ERROR', 'provinceCode: Unsupported value');
  }
  if (parsed.wardCode && !province.wards.some(ward => ward.code === parsed.wardCode)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'wardCode: Unsupported value for province');
  }

  if (parsed.roomType) {
    const supportedRoomType = await query(
      'SELECT 1 FROM room_types WHERE code = $1 AND is_active = true LIMIT 1',
      [parsed.roomType]
    );
    if (!supportedRoomType.rows.length) {
      throw new AppError(400, 'VALIDATION_ERROR', 'roomType: Unsupported value');
    }
  }

  if (parsed.amenityIds.length) {
    const supportedAmenities = await query(
      'SELECT id FROM amenities WHERE id = ANY($1::integer[])',
      [parsed.amenityIds]
    );
    if (supportedAmenities.rows.length !== parsed.amenityIds.length) {
      throw new AppError(400, 'VALIDATION_ERROR', 'amenityIds: Unsupported value');
    }
  }

  if (parsed.district) {
    const supportedDistrict = await query(
      "SELECT 1 FROM listings WHERE status = 'approved' AND district = $1 LIMIT 1",
      [parsed.district]
    );
    if (!supportedDistrict.rows.length) {
      throw new AppError(400, 'VALIDATION_ERROR', 'district: Unsupported value');
    }
  }

  const conditions = ["l.status = 'approved'"];
  const params = [];
  if (keyword) {
    params.push(`%${escapeLikePattern(keyword)}%`);
    const parameter = `$${params.length}`;
    conditions.push(`(l.title ILIKE ${parameter} ESCAPE E'\\\\' OR
      l.address ILIKE ${parameter} ESCAPE E'\\\\' OR
      l.district ILIKE ${parameter} ESCAPE E'\\\\')`);
  }
  if (parsed.district) {
    params.push(parsed.district);
    conditions.push(`l.district = $${params.length}`);
  }
  if (parsed.provinceCode) {
    params.push(parsed.provinceCode);
    conditions.push(`l.province_code = $${params.length}`);
  }
  if (parsed.wardCode) {
    params.push(parsed.wardCode);
    conditions.push(`l.ward_code = $${params.length}`);
  }
  if (parsed.roomType) {
    params.push(parsed.roomType);
    conditions.push(`rt.code = $${params.length} AND rt.is_active = true`);
  }
  if (parsed.maxPrice !== undefined) {
    params.push(parsed.maxPrice);
    conditions.push(`l.price <= $${params.length}`);
  }
  if (parsed.minAreaM2 !== undefined) {
    params.push(parsed.minAreaM2);
    conditions.push(`l.area_m2 >= $${params.length}`);
  }
  if (parsed.maxAreaM2 !== undefined) {
    params.push(parsed.maxAreaM2);
    conditions.push(`l.area_m2 <= $${params.length}`);
  }
  if (parsed.amenityIds.length) {
    params.push(parsed.amenityIds);
    const amenityIdsParameter = `$${params.length}`;
    params.push(parsed.amenityIds.length);
    const requiredAmenitiesParameter = `$${params.length}`;
    conditions.push(`l.id IN (
      SELECT la.listing_id
      FROM listing_amenities la
      WHERE la.amenity_id = ANY(${amenityIdsParameter}::integer[])
      GROUP BY la.listing_id
      HAVING COUNT(DISTINCT la.amenity_id) = ${requiredAmenitiesParameter}
    )`);
  }
  const where = conditions.join(' AND ');

  const count = await query(`SELECT COUNT(*) AS total
    FROM listings l
    LEFT JOIN room_types rt ON rt.id = l.room_type_id
    WHERE ${where}`, params);
  if (!count.rows[0]) throw new Error('Listing search count query returned no result');
  const total = Number(count.rows[0].total);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Listing search count is invalid');

  const offset = (parsed.page - 1) * PAGE_SIZE;
  const results = await query(
    `SELECT l.id, l.title, l.price, l.area_m2, l.address, l.district, l.province_code, l.ward_code,
        rt.code AS room_type_code, rt.name AS room_type_name,
        (SELECT image.url
          FROM listing_images image
          WHERE image.listing_id = l.id
          ORDER BY image.is_cover DESC, image.sort_order, image.id
          LIMIT 1) AS cover_image_url,
        COALESCE((SELECT json_agg(json_build_object('id', a.id::text, 'name', a.name)
          ORDER BY a.name, a.id)
          FROM listing_amenities la
          JOIN amenities a ON a.id = la.amenity_id
          WHERE la.listing_id = l.id), '[]'::json) AS amenities,
        l.created_at
      FROM listings l
      LEFT JOIN room_types rt ON rt.id = l.room_type_id
      WHERE ${where}
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, PAGE_SIZE, offset]
  );

  return {
    listings: results.rows.map(publicListing),
    pagination: { page: parsed.page, limit: PAGE_SIZE, total },
  };
}

async function getApprovedListingById(input) {
  const id = listingIdSchema.parse(input);
  const result = await query(
    `SELECT l.id, l.title, l.description, l.price, l.area_m2, l.address, l.district, l.province_code, l.ward_code,
        rt.code AS room_type_code, rt.name AS room_type_name,
        (SELECT image.url
          FROM listing_images image
          WHERE image.listing_id = l.id
          ORDER BY image.is_cover DESC, image.sort_order, image.id
          LIMIT 1) AS cover_image_url,
        COALESCE((SELECT json_agg(json_build_object(
          'url', image.url, 'isCover', image.is_cover
        ) ORDER BY image.sort_order, image.id)
          FROM listing_images image
          WHERE image.listing_id = l.id), '[]'::json) AS images,
        COALESCE((SELECT json_agg(json_build_object('id', a.id::text, 'name', a.name)
          ORDER BY a.name, a.id)
          FROM listing_amenities la
          JOIN amenities a ON a.id = la.amenity_id
          WHERE la.listing_id = l.id), '[]'::json) AS amenities,
        l.created_at
      FROM listings l
      LEFT JOIN room_types rt ON rt.id = l.room_type_id
      WHERE l.id = $1 AND l.status = 'approved'
      LIMIT 1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Listing not found');

  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    price: Number(row.price),
    areaM2: Number(row.area_m2),
    address: row.address,
    district: row.district,
    provinceCode: row.province_code || null,
    wardCode: row.ward_code || null,
    roomType: row.room_type_code
      ? { code: row.room_type_code, name: row.room_type_name }
      : null,
    coverImageUrl: row.cover_image_url || null,
    images: Array.isArray(row.images) ? row.images : [],
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

module.exports = { getListingFilterOptions, searchListings, getApprovedListingById };
