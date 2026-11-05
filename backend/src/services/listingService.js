const { z } = require('zod');
const { pool } = require('../db');
const AppError = require('../utils/AppError');
const { isDatabaseId } = require('../utils/databaseId');

const deleteBody = z.object({}).strict();

async function deleteOwnedListing(actorId, listingId, input) {
  if (!isDatabaseId(actorId)) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  if (!isDatabaseId(listingId)) throw new AppError(400, 'VALIDATION_ERROR', 'A valid listing ID is required');
  deleteBody.parse(input === undefined ? {} : input);
  const client = await pool.connect();
  let releaseError;
  try {
    await client.query('BEGIN');
    // Keep role/status stable through deletion, rather than trusting middleware's
    // earlier snapshot. Lock order is always actor, then the target listing.
    const actor = (await client.query('SELECT role, is_active FROM users WHERE id = $1 FOR UPDATE', [actorId])).rows[0];
    if (!actor) throw new AppError(401, 'UNAUTHORIZED', 'Session account no longer exists');
    if (!actor.is_active) throw new AppError(403, 'INACTIVE_ACCOUNT', 'Account is inactive');
    if (actor.role !== 'landlord') throw new AppError(403, 'FORBIDDEN', 'Landlord access is required');
    const listing = (await client.query('SELECT owner_id FROM listings WHERE id = $1 FOR UPDATE', [listingId])).rows[0];
    if (!listing) throw new AppError(404, 'NOT_FOUND', 'Listing not found');
    if (listing.owner_id !== actorId) throw new AppError(403, 'FORBIDDEN', 'Listing ownership is required');
    const removed = await client.query('DELETE FROM listings WHERE id = $1 AND owner_id = $2 RETURNING id', [listingId, actorId]);
    if (!removed.rows[0]) throw new Error('Listing deletion did not return a row');
    // Existing FK cascades remove images, amenity links, nearby places/favorites.
    await client.query('COMMIT');
    return { id: removed.rows[0].id, deleted: true };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { releaseError = rollbackError; }
    throw err;
  } finally {
    client.release(releaseError);
  }
}

module.exports = { deleteOwnedListing };
