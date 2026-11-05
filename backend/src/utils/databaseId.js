const MAX_DATABASE_ID = '9223372036854775807';

/** Canonical positive PostgreSQL BIGINT, kept as a string without Number rounding. */
function isDatabaseId(value) {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) &&
    (value.length < MAX_DATABASE_ID.length ||
     (value.length === MAX_DATABASE_ID.length && value <= MAX_DATABASE_ID));
}

module.exports = { isDatabaseId, MAX_DATABASE_ID };
