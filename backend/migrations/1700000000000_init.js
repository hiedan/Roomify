/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension('postgis', { ifNotExists: true });

  pgm.createTable('users', {
    id: { type: 'bigserial', primaryKey: true },
    full_name: { type: 'varchar(100)', notNull: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    phone: { type: 'varchar(20)' },
    role: { type: 'varchar(20)', notNull: true, default: 'tenant' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('users', 'users_role_check', {
    check: "role IN ('tenant','landlord','admin')",
  });

  pgm.createTable('listings', {
    id: { type: 'bigserial', primaryKey: true },
    owner_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'CASCADE' },
    reviewed_by: { type: 'bigint', references: 'users', onDelete: 'SET NULL' },
    title: { type: 'varchar(150)', notNull: true },
    description: { type: 'text' },
    price: { type: 'integer', notNull: true },
    area_m2: { type: 'real', notNull: true },
    address: { type: 'varchar(255)', notNull: true },
    district: { type: 'varchar(100)', notNull: true },
    lat: { type: 'double precision', notNull: true },
    lng: { type: 'double precision', notNull: true },
    geom: { type: 'geography(Point,4326)', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    reject_reason: { type: 'varchar(500)' },
    reviewed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('listings', 'listings_status_check', {
    check: "status IN ('pending','approved','rejected')",
  });
  pgm.addConstraint('listings', 'listings_price_check', { check: 'price > 0' });
  pgm.addConstraint('listings', 'listings_area_check', { check: 'area_m2 > 0' });
  pgm.addConstraint('listings', 'listings_lat_check', { check: 'lat BETWEEN -90 AND 90' });
  pgm.addConstraint('listings', 'listings_lng_check', { check: 'lng BETWEEN -180 AND 180' });
  pgm.createIndex('listings', 'status');
  pgm.createIndex('listings', 'price');
  pgm.createIndex('listings', 'owner_id');
  pgm.createIndex('listings', 'geom', { method: 'gist' });

  pgm.createTable('listing_images', {
    id: { type: 'bigserial', primaryKey: true },
    listing_id: { type: 'bigint', notNull: true, references: 'listings', onDelete: 'CASCADE' },
    url: { type: 'text', notNull: true },
    is_cover: { type: 'boolean', notNull: true, default: false },
    sort_order: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.createIndex('listing_images', 'listing_id');

  pgm.createTable('amenities', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true, unique: true },
    icon: { type: 'varchar(50)' },
  });

  pgm.createTable('listing_amenities', {
    listing_id: { type: 'bigint', notNull: true, references: 'listings', onDelete: 'CASCADE' },
    amenity_id: { type: 'integer', notNull: true, references: 'amenities', onDelete: 'CASCADE' },
  });
  pgm.addConstraint('listing_amenities', 'listing_amenities_pkey', {
    primaryKey: ['listing_id', 'amenity_id'],
  });

  pgm.createTable('nearby_places', {
    id: { type: 'bigserial', primaryKey: true },
    listing_id: { type: 'bigint', notNull: true, references: 'listings', onDelete: 'CASCADE' },
    category: { type: 'varchar(50)', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    distance_m: { type: 'integer', notNull: true },
    lat: { type: 'double precision' },
    lng: { type: 'double precision' },
    google_place_id: { type: 'varchar(255)' },
  });
  pgm.createIndex('nearby_places', ['listing_id', 'category']);

  pgm.createTable('favorites', {
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'CASCADE' },
    listing_id: { type: 'bigint', notNull: true, references: 'listings', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('favorites', 'favorites_pkey', { primaryKey: ['user_id', 'listing_id'] });

  pgm.sql(`
    INSERT INTO amenities (name, icon) VALUES
      ('Máy lạnh', 'ac'),
      ('Wifi', 'wifi'),
      ('Chỗ để xe', 'parking'),
      ('Gác lửng', 'loft'),
      ('Nhà vệ sinh riêng', 'toilet'),
      ('Máy giặt', 'washer'),
      ('Nóng lạnh', 'heater'),
      ('Giờ giấc tự do', 'clock');
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('favorites');
  pgm.dropTable('nearby_places');
  pgm.dropTable('listing_amenities');
  pgm.dropTable('amenities');
  pgm.dropTable('listing_images');
  pgm.dropTable('listings');
  pgm.dropTable('users');
};
