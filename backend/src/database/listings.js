const { query } = require('../db');

async function findApproved({ page, limit }) {
  // One statement keeps the page and count consistent, including an empty last page.
  const { rows } = await query(
    `WITH approved AS (
       SELECT id, title, price, area_m2, address, district, lat, lng
       FROM listings WHERE status = 'approved'
     ), page_rows AS (
       SELECT * FROM approved ORDER BY id DESC LIMIT $1 OFFSET $2
     )
     SELECT (SELECT count(*)::int FROM approved) AS total,
       COALESCE((SELECT json_agg(page_rows ORDER BY id DESC) FROM page_rows), '[]'::json) AS items`,
    [limit, (page - 1) * limit]
  );
  return rows[0];
}
module.exports = { findApproved };
