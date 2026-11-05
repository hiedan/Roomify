exports.up = (pgm) => {
  pgm.createTable('admin_action_audits', {
    id: { type: 'bigserial', primaryKey: true },
    actor_user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    target_user_id: { type: 'bigint', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    action_type: { type: 'varchar(30)', notNull: true },
    previous_value: { type: 'varchar(20)', notNull: true },
    new_value: { type: 'varchar(20)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('admin_action_audits', 'admin_action_audits_values_check', {
    check: `(action_type = 'role_change' AND previous_value IN ('tenant', 'landlord')
             AND new_value IN ('tenant', 'landlord') AND previous_value <> new_value)
         OR (action_type = 'account_disable' AND previous_value = 'true' AND new_value = 'false')
         OR (action_type = 'account_enable' AND previous_value = 'false' AND new_value = 'true')`,
  });
  pgm.addConstraint('admin_action_audits', 'admin_action_audits_distinct_users_check', {
    check: 'actor_user_id <> target_user_id',
  });
  pgm.createIndex('admin_action_audits', ['target_user_id', 'created_at']);
  pgm.createIndex('admin_action_audits', 'actor_user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('admin_action_audits');
};
