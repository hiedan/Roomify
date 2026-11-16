const { z } = require('zod');
const { query } = require('../db');
const AppError = require('../utils/AppError');

const PAGE_SIZE = 12;
const searchQuerySchema = z.object({
  keyword: z.string().max(200).optional(),
  district: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
}).strict();

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
    query(`SELECT DISTINCT a.id, a.name
      FROM amenities a
      JOIN listing_amenities la ON la.amenity_id = a.id
      JOIN listings l ON l.id = la.listing_id
      WHERE l.status = 'approved'
      ORDER BY a.name, a.id`),
  ]);
  return {
    districts: districts.rows.map(row => row.district),
    roomTypes: roomTypes.rows.map(row => ({ code: row.code, name: row.name })),
    amenities: amenities.rows.map(row => ({ id: String(row.id), name: row.name })),
  };
}

async function searchListings(input) {
  const parsed = searchQuerySchema.parse(input);
  const keyword = normalizeKeyword(parsed.keyword);

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
  const where = conditions.join(' AND ');

  const count = await query(`SELECT COUNT(*) AS total FROM listings l WHERE ${where}`, params);
  if (!count.rows[0]) throw new Error('Listing search count query returned no result');
  const total = Number(count.rows[0].total);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Listing search count is invalid');

  const offset = (parsed.page - 1) * PAGE_SIZE;
  const results = await query(
    `SELECT l.id, l.title, l.price, l.area_m2, l.address, l.district,
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

module.exports = { getListingFilterOptions, searchListings };
