// Express owns access control; do not expose application/password tables to Data API roles.
// Preserve existing RLS policies and the owning backend role's privileges.
exports.up = (pgm) => {
  pgm.sql(`DO $roomify$
  DECLARE table_name text; sequence_name text; api_role text;
  BEGIN
    FOREACH table_name IN ARRAY ARRAY['users','listings','listing_images','amenities',
      'listing_amenities','nearby_places','favorites','admin_action_audits','landlord_requests','pgmigrations']
    LOOP
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
      sequence_name := NULL;
      IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = format('public.%I', table_name)::regclass
        AND attname = 'id' AND NOT attisdropped) THEN
        sequence_name := pg_get_serial_sequence(format('public.%I', table_name), 'id');
      END IF;
      IF sequence_name IS NOT NULL THEN
        EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC', sequence_name);
      END IF;
      FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
          EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, api_role);
          IF sequence_name IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM %I', sequence_name, api_role);
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END $roomify$;`);
};

exports.down = () => { throw new Error('Previous external grants cannot be safely reconstructed automatically'); };
