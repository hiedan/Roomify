exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('room_types', {
    id: { type: 'serial', primaryKey: true },
    code: { type: 'varchar(30)', notNull: true, unique: true },
    name: { type: 'varchar(100)', notNull: true, unique: true },
    is_active: { type: 'boolean', notNull: true, default: true },
  });
  pgm.addConstraint('room_types', 'room_types_code_check', {
    check: "code IN ('private_room','shared_room','studio','apartment')",
  });
  pgm.sql(`INSERT INTO room_types (code, name) VALUES
    ('private_room', 'Phòng trọ riêng'),
    ('shared_room', 'Phòng ở ghép'),
    ('studio', 'Studio / căn hộ mini'),
    ('apartment', 'Căn hộ chung cư')`);

  pgm.addColumn('listings', {
    room_type_id: { type: 'integer', references: 'room_types', onDelete: 'RESTRICT' },
  });
  pgm.createIndex('listings', 'room_type_id');

  pgm.sql(`REVOKE ALL ON TABLE public.room_types FROM PUBLIC;
    DO $roomify$
    DECLARE api_role text; sequence_name text;
    BEGIN
      sequence_name := pg_get_serial_sequence('public.room_types', 'id');
      IF sequence_name IS NOT NULL THEN
        EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC', sequence_name);
      END IF;
      FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
          EXECUTE format('REVOKE ALL ON TABLE public.room_types FROM %I', api_role);
          IF sequence_name IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM %I', sequence_name, api_role);
          END IF;
        END IF;
      END LOOP;
    END $roomify$`);
};

exports.down = (pgm) => {
  pgm.dropColumn('listings', 'room_type_id');
  pgm.dropTable('room_types');
};
