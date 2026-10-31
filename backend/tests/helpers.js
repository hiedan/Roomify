const { query } = require('../src/db');

/** Wipe all data between tests. Seeded `amenities` are kept. */
async function resetDb() {
  await query(
    `TRUNCATE users, listings, listing_images, listing_amenities, nearby_places, favorites
     RESTART IDENTITY CASCADE`
  );
}

module.exports = { resetDb };
