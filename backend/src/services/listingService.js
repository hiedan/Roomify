const { z } = require('zod');
const { pool } = require('../db');
const AppError = require('../utils/AppError');
const { isDatabaseId } = require('../utils/databaseId');

const createListingSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(150, 'Title cannot exceed 150 characters'),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
  price: z.number().int().positive('Price must be a positive integer in VND'),
  areaM2: z.number().positive('Area must be a positive number in square meters'),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(255, 'Address cannot exceed 255 characters'),
  district: z.string().trim().min(2, 'District must be at least 2 characters').max(100, 'District cannot exceed 100 characters'),
  lat: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  lng: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  roomTypeId: z.number().int().positive('Room type ID must be a positive integer'),
  amenityIds: z.array(z.number().int().positive()).optional().default([]),
  imageUrls: z.array(z.string().url('Each photo must be a valid URL')).min(1, 'At least 1 photo is required').max(10, 'Maximum 10 photos allowed'),
}).strict();

const updateListingSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(150, 'Title cannot exceed 150 characters').optional(),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
  price: z.number().int().positive('Price must be a positive integer in VND').optional(),
  areaM2: z.number().positive('Area must be a positive number in square meters').optional(),
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(255, 'Address cannot exceed 255 characters').optional(),
  district: z.string().trim().min(2, 'District must be at least 2 characters').max(100, 'District cannot exceed 100 characters').optional(),
  lat: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional(),
  lng: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional(),
  roomTypeId: z.number().int().positive('Room type ID must be a positive integer').optional(),
  amenityIds: z.array(z.number().int().positive()).optional(),
  imageUrls: z.array(z.string().url('Each photo must be a valid URL')).min(1, 'At least 1 photo is required').max(10, 'Maximum 10 photos allowed').optional(),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

const queryMineSchema = z.object({
  status: z.enum(['all', 'pending', 'approved', 'rejected']).optional().default('all'),
}).strict();

const deleteBody = z.object({}).strict();

async function createListing(actorId, input) {
  if (!isDatabaseId(actorId)) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  const data = createListingSchema.parse(input);

  const client = await pool.connect();
  let releaseError;
  try {
    await client.query('BEGIN');
    const actor = (await client.query(
      'SELECT role, is_active FROM users WHERE id = $1 FOR UPDATE',
      [actorId]
    )).rows[0];
    if (!actor) throw new AppError(401, 'UNAUTHORIZED', 'Session account no longer exists');
    if (!actor.is_active) throw new AppError(403, 'INACTIVE_ACCOUNT', 'Account is inactive');
    if (actor.role !== 'landlord') throw new AppError(403, 'FORBIDDEN', 'Landlord access is required');

    const roomType = (await client.query(
      'SELECT id, code, name FROM room_types WHERE id = $1 AND is_active = true',
      [data.roomTypeId]
    )).rows[0];
    if (!roomType) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid or inactive room type');

    let verifiedAmenities = [];
    if (data.amenityIds && data.amenityIds.length > 0) {
      const uniqueAmenityIds = [...new Set(data.amenityIds)];
      const amenityRows = (await client.query(
        'SELECT id, name, icon FROM amenities WHERE id = ANY($1::int[])',
        [uniqueAmenityIds]
      )).rows;
      if (amenityRows.length !== uniqueAmenityIds.length) {
        throw new AppError(400, 'VALIDATION_ERROR', 'One or more amenity IDs are invalid');
      }
      verifiedAmenities = amenityRows;
    }

    const insertListingSql = `
      INSERT INTO listings (
        owner_id, title, description, price, area_m2, address, district, lat, lng, geom, room_type_id, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        ST_SetSRID(ST_MakePoint($9, $8), 4326)::geography,
        $10, 'pending'
      ) RETURNING id, owner_id, title, description, price, area_m2, address, district, lat, lng, room_type_id, status, reject_reason, created_at
    `;
    const listingRow = (await client.query(insertListingSql, [
      actorId,
      data.title,
      data.description || null,
      data.price,
      data.areaM2,
      data.address,
      data.district,
      data.lat,
      data.lng,
      data.roomTypeId,
    ])).rows[0];

    const insertedImages = [];
    for (let i = 0; i < data.imageUrls.length; i++) {
      const isCover = i === 0;
      const imgRes = await client.query(
        'INSERT INTO listing_images (listing_id, url, is_cover, sort_order) VALUES ($1, $2, $3, $4) RETURNING id, url, is_cover, sort_order',
        [listingRow.id, data.imageUrls[i], isCover, i]
      );
      insertedImages.push({
        id: String(imgRes.rows[0].id),
        url: imgRes.rows[0].url,
        isCover: imgRes.rows[0].is_cover,
        sortOrder: imgRes.rows[0].sort_order,
      });
    }

    if (data.amenityIds && data.amenityIds.length > 0) {
      const uniqueAmenityIds = [...new Set(data.amenityIds)];
      for (const amenityId of uniqueAmenityIds) {
        await client.query(
          'INSERT INTO listing_amenities (listing_id, amenity_id) VALUES ($1, $2)',
          [listingRow.id, amenityId]
        );
      }
    }

    await client.query('COMMIT');

    return {
      id: String(listingRow.id),
      ownerId: String(listingRow.owner_id),
      title: listingRow.title,
      description: listingRow.description,
      price: listingRow.price,
      areaM2: Number(listingRow.area_m2),
      address: listingRow.address,
      district: listingRow.district,
      lat: Number(listingRow.lat),
      lng: Number(listingRow.lng),
      roomType: {
        id: roomType.id,
        code: roomType.code,
        name: roomType.name,
      },
      status: listingRow.status,
      rejectReason: listingRow.reject_reason || null,
      coverImageUrl: insertedImages[0] ? insertedImages[0].url : null,
      amenities: verifiedAmenities.map(a => ({ id: a.id, name: a.name, icon: a.icon })),
      images: insertedImages,
      createdAt: listingRow.created_at,
    };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { releaseError = rollbackError; }
    throw err;
  } finally {
    client.release(releaseError);
  }
}

async function getLandlordListings(actorId, rawQuery) {
  if (!isDatabaseId(actorId)) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  const queryParams = queryMineSchema.parse(rawQuery === undefined ? {} : rawQuery);

  const countSql = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
    FROM listings
    WHERE owner_id = $1
  `;
  const countRes = await pool.query(countSql, [actorId]);
  const summaryRow = countRes.rows[0] || {};
  const summary = {
    total: summaryRow.total || 0,
    pending: summaryRow.pending || 0,
    approved: summaryRow.approved || 0,
    rejected: summaryRow.rejected || 0,
  };

  let listingsSql = `
    SELECT
      l.id,
      l.owner_id,
      l.title,
      l.description,
      l.price,
      l.area_m2,
      l.address,
      l.district,
      l.lat,
      l.lng,
      l.status,
      l.reject_reason,
      l.created_at,
      rt.id AS room_type_id,
      rt.code AS room_type_code,
      rt.name AS room_type_name
    FROM listings l
    LEFT JOIN room_types rt ON l.room_type_id = rt.id
    WHERE l.owner_id = $1
  `;
  const sqlArgs = [actorId];

  if (queryParams.status && queryParams.status !== 'all') {
    listingsSql += ' AND l.status = $2';
    sqlArgs.push(queryParams.status);
  }

  listingsSql += ' ORDER BY l.created_at DESC, l.id DESC';

  const { rows } = await pool.query(listingsSql, sqlArgs);
  if (rows.length === 0) {
    return { listings: [], summary };
  }

  const listingIds = rows.map(r => r.id);

  const imagesRes = await pool.query(
    'SELECT id, listing_id, url, is_cover, sort_order FROM listing_images WHERE listing_id = ANY($1::bigint[]) ORDER BY sort_order ASC, id ASC',
    [listingIds]
  );
  const imagesByListing = new Map();
  for (const img of imagesRes.rows) {
    const list = imagesByListing.get(img.listing_id) || [];
    list.push({
      id: String(img.id),
      url: img.url,
      isCover: img.is_cover,
      sortOrder: img.sort_order,
    });
    imagesByListing.set(img.listing_id, list);
  }

  const amenitiesRes = await pool.query(
    `SELECT la.listing_id, a.id, a.name, a.icon
     FROM listing_amenities la
     JOIN amenities a ON la.amenity_id = a.id
     WHERE la.listing_id = ANY($1::bigint[])
     ORDER BY a.id ASC`,
    [listingIds]
  );
  const amenitiesByListing = new Map();
  for (const am of amenitiesRes.rows) {
    const list = amenitiesByListing.get(am.listing_id) || [];
    list.push({
      id: am.id,
      name: am.name,
      icon: am.icon,
    });
    amenitiesByListing.set(am.listing_id, list);
  }

  const listings = rows.map(r => {
    const images = imagesByListing.get(r.id) || [];
    const coverImage = images.find(img => img.isCover) || images[0] || null;
    return {
      id: String(r.id),
      ownerId: String(r.owner_id),
      title: r.title,
      description: r.description,
      price: r.price,
      areaM2: Number(r.area_m2),
      address: r.address,
      district: r.district,
      lat: Number(r.lat),
      lng: Number(r.lng),
      status: r.status,
      rejectReason: r.reject_reason || null,
      roomType: r.room_type_id ? {
        id: r.room_type_id,
        code: r.room_type_code,
        name: r.room_type_name,
      } : null,
      coverImageUrl: coverImage ? coverImage.url : null,
      amenities: amenitiesByListing.get(r.id) || [],
      images,
      createdAt: r.created_at,
    };
  });

  return { listings, summary };
}

async function getLandlordListingById(actorId, listingId) {
  if (!isDatabaseId(actorId)) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  if (!isDatabaseId(listingId)) throw new AppError(400, 'VALIDATION_ERROR', 'A valid listing ID is required');

  const sql = `
    SELECT
      l.id,
      l.owner_id,
      l.title,
      l.description,
      l.price,
      l.area_m2,
      l.address,
      l.district,
      l.lat,
      l.lng,
      l.status,
      l.reject_reason,
      l.created_at,
      rt.id AS room_type_id,
      rt.code AS room_type_code,
      rt.name AS room_type_name
    FROM listings l
    LEFT JOIN room_types rt ON l.room_type_id = rt.id
    WHERE l.id = $1
  `;
  const { rows } = await pool.query(sql, [listingId]);
  const listing = rows[0];
  if (!listing) throw new AppError(404, 'NOT_FOUND', 'Listing not found');
  if (String(listing.owner_id) !== actorId) {
    throw new AppError(403, 'FORBIDDEN', 'Listing ownership is required');
  }

  const imagesRes = await pool.query(
    'SELECT id, url, is_cover, sort_order FROM listing_images WHERE listing_id = $1 ORDER BY sort_order ASC, id ASC',
    [listingId]
  );
  const images = imagesRes.rows.map(img => ({
    id: String(img.id),
    url: img.url,
    isCover: img.is_cover,
    sortOrder: img.sort_order,
  }));
  const coverImage = images.find(img => img.isCover) || images[0] || null;

  const amenitiesRes = await pool.query(
    `SELECT a.id, a.name, a.icon
     FROM listing_amenities la
     JOIN amenities a ON la.amenity_id = a.id
     WHERE la.listing_id = $1
     ORDER BY a.id ASC`,
    [listingId]
  );
  const amenities = amenitiesRes.rows.map(a => ({
    id: a.id,
    name: a.name,
    icon: a.icon,
  }));

  return {
    id: String(listing.id),
    ownerId: String(listing.owner_id),
    title: listing.title,
    description: listing.description,
    price: listing.price,
    areaM2: Number(listing.area_m2),
    address: listing.address,
    district: listing.district,
    lat: Number(listing.lat),
    lng: Number(listing.lng),
    status: listing.status,
    rejectReason: listing.reject_reason || null,
    roomType: listing.room_type_id ? {
      id: listing.room_type_id,
      code: listing.room_type_code,
      name: listing.room_type_name,
    } : null,
    coverImageUrl: coverImage ? coverImage.url : null,
    amenities,
    images,
    createdAt: listing.created_at,
  };
}

async function updateOwnedListing(actorId, listingId, input) {
  if (!isDatabaseId(actorId)) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  if (!isDatabaseId(listingId)) throw new AppError(400, 'VALIDATION_ERROR', 'A valid listing ID is required');
  const data = updateListingSchema.parse(input);

  const client = await pool.connect();
  let releaseError;
  try {
    await client.query('BEGIN');
    const actor = (await client.query(
      'SELECT role, is_active FROM users WHERE id = $1 FOR UPDATE',
      [actorId]
    )).rows[0];
    if (!actor) throw new AppError(401, 'UNAUTHORIZED', 'Session account no longer exists');
    if (!actor.is_active) throw new AppError(403, 'INACTIVE_ACCOUNT', 'Account is inactive');
    if (actor.role !== 'landlord') throw new AppError(403, 'FORBIDDEN', 'Landlord access is required');

    const existingListing = (await client.query(
      'SELECT * FROM listings WHERE id = $1 FOR UPDATE',
      [listingId]
    )).rows[0];
    if (!existingListing) throw new AppError(404, 'NOT_FOUND', 'Listing not found');
    if (String(existingListing.owner_id) !== actorId) {
      throw new AppError(403, 'FORBIDDEN', 'Listing ownership is required');
    }

    if (data.roomTypeId !== undefined) {
      const roomType = (await client.query(
        'SELECT id FROM room_types WHERE id = $1 AND is_active = true',
        [data.roomTypeId]
      )).rows[0];
      if (!roomType) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid or inactive room type');
    }

    if (data.amenityIds !== undefined && data.amenityIds.length > 0) {
      const uniqueAmenityIds = [...new Set(data.amenityIds)];
      const amenityRows = (await client.query(
        'SELECT id FROM amenities WHERE id = ANY($1::int[])',
        [uniqueAmenityIds]
      )).rows;
      if (amenityRows.length !== uniqueAmenityIds.length) {
        throw new AppError(400, 'VALIDATION_ERROR', 'One or more amenity IDs are invalid');
      }
    }

    // Load existing amenities and images to check for changes
    const currentAmenitiesRes = await client.query(
      'SELECT amenity_id FROM listing_amenities WHERE listing_id = $1 ORDER BY amenity_id ASC',
      [listingId]
    );
    const currentAmenityIds = currentAmenitiesRes.rows.map(r => r.amenity_id);

    const currentImagesRes = await client.query(
      'SELECT url FROM listing_images WHERE listing_id = $1 ORDER BY sort_order ASC, id ASC',
      [listingId]
    );
    const currentImageUrls = currentImagesRes.rows.map(r => r.url);

    // No-op detection
    let hasChanges = false;
    if (data.title !== undefined && data.title !== existingListing.title) hasChanges = true;
    if (data.description !== undefined && (data.description || null) !== existingListing.description) hasChanges = true;
    if (data.price !== undefined && data.price !== existingListing.price) hasChanges = true;
    if (data.areaM2 !== undefined && Math.abs(data.areaM2 - existingListing.area_m2) > 0.001) hasChanges = true;
    if (data.address !== undefined && data.address !== existingListing.address) hasChanges = true;
    if (data.district !== undefined && data.district !== existingListing.district) hasChanges = true;
    if (data.lat !== undefined && Math.abs(data.lat - existingListing.lat) > 0.000001) hasChanges = true;
    if (data.lng !== undefined && Math.abs(data.lng - existingListing.lng) > 0.000001) hasChanges = true;
    if (data.roomTypeId !== undefined && data.roomTypeId !== existingListing.room_type_id) hasChanges = true;

    if (data.amenityIds !== undefined) {
      const newIdsSorted = [...new Set(data.amenityIds)].sort((a, b) => a - b);
      if (newIdsSorted.length !== currentAmenityIds.length ||
          !newIdsSorted.every((val, idx) => val === currentAmenityIds[idx])) {
        hasChanges = true;
      }
    }

    if (data.imageUrls !== undefined) {
      if (data.imageUrls.length !== currentImageUrls.length ||
          !data.imageUrls.every((val, idx) => val === currentImageUrls[idx])) {
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      await client.query('COMMIT');
      return getLandlordListingById(actorId, listingId);
    }

    // Build update statement
    const updateSets = [];
    const updateVals = [];
    let pIdx = 1;

    if (data.title !== undefined) {
      updateSets.push(`title = $${pIdx++}`);
      updateVals.push(data.title);
    }
    if (data.description !== undefined) {
      updateSets.push(`description = $${pIdx++}`);
      updateVals.push(data.description || null);
    }
    if (data.price !== undefined) {
      updateSets.push(`price = $${pIdx++}`);
      updateVals.push(data.price);
    }
    if (data.areaM2 !== undefined) {
      updateSets.push(`area_m2 = $${pIdx++}`);
      updateVals.push(data.areaM2);
    }
    if (data.address !== undefined) {
      updateSets.push(`address = $${pIdx++}`);
      updateVals.push(data.address);
    }
    if (data.district !== undefined) {
      updateSets.push(`district = $${pIdx++}`);
      updateVals.push(data.district);
    }
    const targetLat = data.lat !== undefined ? data.lat : existingListing.lat;
    const targetLng = data.lng !== undefined ? data.lng : existingListing.lng;
    if (data.lat !== undefined || data.lng !== undefined) {
      updateSets.push(`lat = $${pIdx++}`);
      updateVals.push(targetLat);
      updateSets.push(`lng = $${pIdx++}`);
      updateVals.push(targetLng);
      updateSets.push(`geom = ST_SetSRID(ST_MakePoint($${pIdx++}, $${pIdx++}), 4326)::geography`);
      updateVals.push(targetLng, targetLat);
    }
    if (data.roomTypeId !== undefined) {
      updateSets.push(`room_type_id = $${pIdx++}`);
      updateVals.push(data.roomTypeId);
    }

    // Substantive update resets moderation status to pending and clears reject_reason
    updateSets.push("status = 'pending'");
    updateSets.push('reject_reason = NULL');
    updateSets.push('reviewed_by = NULL');
    updateSets.push('reviewed_at = NULL');

    updateVals.push(listingId, actorId);
    const updateSql = `
      UPDATE listings
      SET ${updateSets.join(', ')}
      WHERE id = $${pIdx++} AND owner_id = $${pIdx++}
      RETURNING id
    `;
    await client.query(updateSql, updateVals);

    // Update images if provided
    if (data.imageUrls !== undefined) {
      await client.query('DELETE FROM listing_images WHERE listing_id = $1', [listingId]);
      for (let i = 0; i < data.imageUrls.length; i++) {
        const isCover = i === 0;
        await client.query(
          'INSERT INTO listing_images (listing_id, url, is_cover, sort_order) VALUES ($1, $2, $3, $4)',
          [listingId, data.imageUrls[i], isCover, i]
        );
      }
    }

    // Update amenities if provided
    if (data.amenityIds !== undefined) {
      await client.query('DELETE FROM listing_amenities WHERE listing_id = $1', [listingId]);
      const uniqueAmenityIds = [...new Set(data.amenityIds)];
      for (const amenityId of uniqueAmenityIds) {
        await client.query(
          'INSERT INTO listing_amenities (listing_id, amenity_id) VALUES ($1, $2)',
          [listingId, amenityId]
        );
      }
    }

    await client.query('COMMIT');
    return getLandlordListingById(actorId, listingId);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { releaseError = rollbackError; }
    throw err;
  } finally {
    client.release(releaseError);
  }
}

async function deleteOwnedListing(actorId, listingId, input) {
  if (!isDatabaseId(actorId)) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  if (!isDatabaseId(listingId)) throw new AppError(400, 'VALIDATION_ERROR', 'A valid listing ID is required');
  deleteBody.parse(input === undefined ? {} : input);
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query('BEGIN');
    const actor = (await client.query('SELECT role, is_active FROM users WHERE id = $1 FOR UPDATE', [actorId])).rows[0];
    if (!actor) throw new AppError(401, 'UNAUTHORIZED', 'Session account no longer exists');
    if (!actor.is_active) throw new AppError(403, 'INACTIVE_ACCOUNT', 'Account is inactive');
    if (actor.role !== 'landlord') throw new AppError(403, 'FORBIDDEN', 'Landlord access is required');
    const listing = (await client.query('SELECT owner_id FROM listings WHERE id = $1 FOR UPDATE', [listingId])).rows[0];
    if (!listing) throw new AppError(404, 'NOT_FOUND', 'Listing not found');
    if (listing.owner_id !== actorId) throw new AppError(403, 'FORBIDDEN', 'Listing ownership is required');
    const removed = await client.query('DELETE FROM listings WHERE id = $1 AND owner_id = $2 RETURNING id', [listingId, actorId]);
    if (!removed.rows[0]) throw new Error('Listing deletion did not return a row');
    await client.query('COMMIT');
    return { id: removed.rows[0].id, deleted: true };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { releaseError = rollbackError; }
    throw err;
  } finally {
    client.release(releaseError);
  }
}

module.exports = {
  createListingSchema,
  updateListingSchema,
  queryMineSchema,
  deleteBody,
  createListing,
  getLandlordListings,
  getLandlordListingById,
  updateOwnedListing,
  deleteOwnedListing,
};
