const request = require('supertest');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { createApp } = require('../src/app');
const { query, pool } = require('../src/db');
const config = require('../src/config');
const auth = require('../src/services/authService');

const api = request(createApp());
const users = [];
const listings = [];

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test' || new URL(config.databaseUrl).pathname !== '/nhatro_test') {
    throw new Error('Listing integration fixtures require nhatro_test');
  }
  expect((await query('SELECT current_database() AS name')).rows[0].name).toBe('nhatro_test');
});
afterEach(async () => {
  jest.restoreAllMocks();
  if (listings.length) await query('DELETE FROM listings WHERE id = ANY($1::bigint[])', [listings]);
  if (users.length) await query('DELETE FROM users WHERE id = ANY($1::bigint[])', [users]);
  listings.length = 0;
  users.length = 0;
});

async function account(role = 'landlord', id = null) {
  const { rows } = await query(
    `INSERT INTO users (id, full_name, email, password_hash, role)
     VALUES (COALESCE($1::bigint, nextval(pg_get_serial_sequence('users', 'id'))),
       'Synthetic listing owner', $2, 'non-login-fixture-hash', $3) RETURNING id, role`,
    [id, `delete-${randomUUID()}@gmail.com`, role]
  );
  users.push(rows[0].id);
  return { ...rows[0], token: auth.issueToken(rows[0]).token };
}
async function item(owner, id = null) {
  const { rows } = await query(
    `INSERT INTO listings (id, owner_id, title, description, price, area_m2, address, district, lat, lng, geom)
     VALUES (COALESCE($1::bigint, nextval(pg_get_serial_sequence('listings','id'))), $2,
       'Synthetic title', 'Private synthetic content', 1000000, 20, 'Synthetic address',
       'Synthetic district', 10, 106, ST_SetSRID(ST_MakePoint(106,10),4326)::geography) RETURNING id`,
    [id, owner.id]
  );
  const listing = rows[0];
  listings.push(listing.id);
  await query("INSERT INTO listing_images (listing_id,url) VALUES ($1,'synthetic-image')", [listing.id]);
  await query('INSERT INTO listing_amenities (listing_id,amenity_id) SELECT $1,id FROM amenities ORDER BY id LIMIT 1', [listing.id]);
  await query("INSERT INTO nearby_places (listing_id,category,name,distance_m) VALUES ($1,'synthetic','Synthetic place',100)", [listing.id]);
  const tenant = await account('tenant');
  await query('INSERT INTO favorites (listing_id,user_id) VALUES ($1,$2)', [listing.id, tenant.id]);
  return listing;
}
function remove(actor, id, body) {
  const req = api.delete(`/api/v1/listings/${encodeURIComponent(id)}`);
  if (actor) req.set('Authorization', `Bearer ${actor.token}`);
  return body === undefined ? req : req.send(body);
}
async function snapshot(id) {
  const state = {};
  for (const table of ['listings', 'listing_images', 'listing_amenities', 'nearby_places', 'favorites']) {
    const key = table === 'listings' ? 'id' : 'listing_id';
    state[table] = (await query(`SELECT * FROM ${table} WHERE ${key} = $1`, [id])).rows;
  }
  return state;
}
function denied(res, status, code) {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({ success: false, error: { code, message: expect.any(String) } });
  expect(JSON.stringify(res.body)).not.toContain('Private synthetic content');
}

test('a real owner delete cascades all listing relations, preserving shared amenities and users', async () => {
  const owner = await account();
  const listing = await item(owner);
  const amenities = (await query('SELECT * FROM amenities ORDER BY id')).rows;
  const res = await remove(owner, listing.id);
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ success: true, data: { id: listing.id, deleted: true } });
  for (const rows of Object.values(await snapshot(listing.id))) expect(rows).toEqual([]);
  expect((await query('SELECT * FROM amenities ORDER BY id')).rows).toEqual(amenities);
  expect((await query('SELECT id FROM users WHERE id = $1', [owner.id])).rows).toHaveLength(1);
  denied(await remove(owner, listing.id), 404, 'NOT_FOUND');
});

test.each(['guest', 'invalid', 'expired'])('%s session cannot delete or change relations', async (kind) => {
  const owner = await account();
  const listing = await item(owner);
  const before = await snapshot(listing.id);
  const actor = kind === 'guest' ? null : { token: kind === 'invalid' ? 'invalid' : jwt.sign(
    { sub: owner.id, role: 'landlord', iat: Math.floor(Date.now() / 1000) - 100, exp: Math.floor(Date.now() / 1000) - 1 },
    config.jwtSecret, { algorithm: 'HS256' }
  ) };
  denied(await remove(actor, listing.id), 401, 'UNAUTHORIZED');
  expect(await snapshot(listing.id)).toEqual(before);
});

test.each(['tenant', 'landlord', 'admin'])('%s nonowner cannot spoof body/query privileges', async role => {
  const owner = await account();
  const actor = await account(role);
  const listing = await item(owner);
  const before = await snapshot(listing.id);
  const res = await api.delete(`/api/v1/listings/${listing.id}?owner_id=${actor.id}&role=landlord`)
    .set('Authorization', `Bearer ${actor.token}`).send({ owner_id: actor.id, userId: owner.id, role: 'landlord' });
  denied(res, 403, 'FORBIDDEN');
  expect(await snapshot(listing.id)).toEqual(before);
});

test.each(['tenant', 'admin'])('%s ownership alone grants no landlord mutation privilege', async role => {
  const actor = await account(role);
  const listing = await item(actor);
  const before = await snapshot(listing.id);
  denied(await remove(actor, listing.id), 403, 'FORBIDDEN');
  expect(await snapshot(listing.id)).toEqual(before);
});

test.each(['inactive', 'role-changed', 'deleted'])('token uses current actor state: %s', async kind => {
  const actor = await account();
  const other = await account();
  const listing = await item(kind === 'deleted' ? other : actor);
  const before = await snapshot(listing.id);
  if (kind === 'inactive') await query('UPDATE users SET is_active = false WHERE id = $1', [actor.id]);
  if (kind === 'role-changed') await query("UPDATE users SET role = 'tenant' WHERE id = $1", [actor.id]);
  if (kind === 'deleted') await query('DELETE FROM users WHERE id = $1', [actor.id]);
  denied(await remove(actor, listing.id), kind === 'deleted' ? 401 : 403,
    kind === 'deleted' ? 'UNAUTHORIZED' : kind === 'inactive' ? 'INACTIVE_ACCOUNT' : 'FORBIDDEN');
  expect(await snapshot(listing.id)).toEqual(before);
});

test.each(['0', '-1', '01', 'bad-id', '9223372036854775808', "1' OR 1=1 --"])(
  'invalid ID %s leaves resources unchanged', async id => {
    const actor = await account();
    const listing = await item(actor);
    const before = await snapshot(listing.id);
    denied(await remove(actor, id), 400, 'VALIDATION_ERROR');
    expect(await snapshot(listing.id)).toEqual(before);
  }
);
test('missing listing returns 404', async () => {
  denied(await remove(await account(), '9223372036854775806'), 404, 'NOT_FOUND');
});
test('owner and resource BIGINT IDs retain exact precision', async () => {
  const owner = await account('landlord', '9007199254740993');
  const listing = await item(owner, '9223372036854775807');
  const res = await remove(owner, listing.id, {});
  expect(res.body).toEqual({ success: true, data: { id: '9223372036854775807', deleted: true } });
  expect((await snapshot(listing.id)).listings).toEqual([]);
});
test.each([{ role: 'landlord' }, { owner_id: '1' }, { userId: '1' }, []])('owner cannot submit unsupported deletion payload %#', async body => {
  const actor = await account();
  const listing = await item(actor);
  const before = await snapshot(listing.id);
  denied(await remove(actor, listing.id, body), 400, 'VALIDATION_ERROR');
  expect(await snapshot(listing.id)).toEqual(before);
});

// Pause at the real service checkout, after production middleware. Every state
// change/read/delete still runs against PostgreSQL; no policy harness is mounted.
function beforeTransaction(change, breakAfterDelete = false) {
  const connect = pool.connect.bind(pool);
  let intercepted = false;
  jest.spyOn(pool, 'connect').mockImplementation((...args) => {
    if (args.length || intercepted) return connect(...args);
    intercepted = true;
    return (async () => {
      await change();
      const client = await connect();
      if (breakAfterDelete) {
        const actual = client.query.bind(client);
        jest.spyOn(client, 'query').mockImplementation((sql, params, ...tail) => {
          if (typeof params === 'function' || tail.length) return actual(sql, params, ...tail);
          return (async () => {
            const result = await actual(sql, params);
            if (/^DELETE FROM listings/.test(sql)) await actual('SELECT 1 / 0');
            return result;
          })();
        });
      }
      return client;
    })();
  });
}
test.each(['owner', 'role', 'inactive', 'missing', 'actor-deleted'])('transaction rechecks %s changed after middleware', async kind => {
  const actor = await account();
  const other = await account();
  const listing = await item(actor);
  let changedState;
  beforeTransaction(async () => {
    if (kind === 'owner') await query('UPDATE listings SET owner_id = $1 WHERE id = $2', [other.id, listing.id]);
    if (kind === 'role') await query("UPDATE users SET role = 'tenant' WHERE id = $1", [actor.id]);
    if (kind === 'inactive') await query('UPDATE users SET is_active = false WHERE id = $1', [actor.id]);
    if (kind === 'missing') await query('DELETE FROM listings WHERE id = $1', [listing.id]);
    if (kind === 'actor-deleted') await query('DELETE FROM users WHERE id = $1', [actor.id]);
    changedState = await snapshot(listing.id);
  });
  denied(await remove(actor, listing.id), kind === 'missing' ? 404 : kind === 'actor-deleted' ? 401 : 403,
    kind === 'missing' ? 'NOT_FOUND' : kind === 'actor-deleted' ? 'UNAUTHORIZED' : kind === 'inactive' ? 'INACTIVE_ACCOUNT' : 'FORBIDDEN');
  expect(await snapshot(listing.id)).toEqual(changedState);
});
test('a PostgreSQL failure after the real DELETE rolls back deletion and every cascade', async () => {
  const actor = await account();
  const listing = await item(actor);
  const before = await snapshot(listing.id);
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  beforeTransaction(async () => {}, true);
  denied(await remove(actor, listing.id), 500, 'INTERNAL');
  expect(await snapshot(listing.id)).toEqual(before);
  expect(log).toHaveBeenCalledWith('Unexpected server error');
});
