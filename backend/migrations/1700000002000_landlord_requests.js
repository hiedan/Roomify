exports.up = (pgm) => {
  pgm.createTable('landlord_requests', {
    id: { type: 'bigserial', primaryKey: true },
    user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'CASCADE' },
    contact_name: { type: 'varchar(100)', notNull: true },
    phone: { type: 'varchar(30)', notNull: true },
    property_address: { type: 'varchar(255)', notNull: true },
    message: { type: 'varchar(1000)', notNull: true, default: '' },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    rejection_reason: { type: 'varchar(500)' },
    reviewed_by: { type: 'bigint', references: 'users', onDelete: 'SET NULL' },
    reviewed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('landlord_requests', 'landlord_requests_status_check', {
    check: "status IN ('pending', 'approved', 'rejected')",
  });
  pgm.addConstraint('landlord_requests', 'landlord_requests_review_check', {
    check: `(status = 'pending' AND reviewed_at IS NULL AND rejection_reason IS NULL)
      OR (status = 'approved' AND reviewed_at IS NOT NULL AND rejection_reason IS NULL)
      OR (status = 'rejected' AND reviewed_at IS NOT NULL AND rejection_reason IS NOT NULL AND length(trim(rejection_reason)) > 0)`,
  });
  pgm.createIndex('landlord_requests', 'user_id', {
    name: 'landlord_requests_one_pending_per_user', unique: true, where: "status = 'pending'",
  });
  pgm.createIndex('landlord_requests', ['user_id', 'created_at']);
  pgm.createIndex('landlord_requests', ['status', 'created_at']);
};

exports.down = (pgm) => { pgm.dropTable('landlord_requests'); };
