exports.shorthands = undefined;

exports.up = (pgm) => {
  // Existing listings keep their historical district text until an owner verifies
  // the corresponding post-merger province and commune/ward codes.
  pgm.addColumn('listings', {
    province_code: { type: 'varchar(2)' },
    ward_code: { type: 'varchar(5)' },
  });
  pgm.addConstraint('listings', 'listings_ward_requires_province', {
    check: 'ward_code IS NULL OR province_code IS NOT NULL',
  });
  pgm.createIndex('listings', ['province_code', 'ward_code'], {
    name: 'listings_administrative_units_idx',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('listings', ['province_code', 'ward_code'], {
    name: 'listings_administrative_units_idx',
  });
  pgm.dropConstraint('listings', 'listings_ward_requires_province');
  pgm.dropColumn('listings', ['province_code', 'ward_code']);
};
