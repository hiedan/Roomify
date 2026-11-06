const { query } = require('../src/db');
const { assertTestTarget } = require('../src/databaseConfig');

/** Wipe all data between tests. Seeded `amenities` are kept. */
async function resetDb() {
  assertTestTarget();
  await query(
    `TRUNCATE admin_action_audits, users, listings, listing_images, listing_amenities, nearby_places, favorites
     RESTART IDENTITY CASCADE`
  );
}

module.exports = { resetDb };
