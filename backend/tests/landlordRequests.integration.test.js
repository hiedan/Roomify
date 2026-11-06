const { assertTestTarget } = require('../src/databaseConfig');
const request = require('supertest');
const { randomUUID } = require('crypto');
const { query, pool } = require('../src/db');
const auth = require('../src/services/authService');
const service = require('../src/services/landlordRequestService');
const { createApp } = require('../src/app');

const api = request(createApp());
const ids = [];
const form = { contactName: 'Synthetic Applicant', phone: '0901 234 567', message: 'Synthetic application' };
let hash;

beforeAll(async () => {
  assertTestTarget();
  hash = await auth.hashPassword('SyntheticRequestFixture!123');
});
afterEach(async () => {
  jest.restoreAllMocks();
  if (ids.length) {
    await query('DELETE FROM admin_action_audits WHERE actor_user_id = ANY($1::bigint[]) OR target_user_id = ANY($1::bigint[])', [ids]);
    await query('DELETE FROM users WHERE id = ANY($1::bigint[])', [ids]);
    ids.length = 0;
  }
});

async function account(role = 'tenant', active = true) {
  const result = await query(`INSERT INTO users (full_name, email, password_hash, role, is_active)
    VALUES ('Landlord Request Fixture', $1, $2, $3, $4) RETURNING id, full_name, email, role, is_active`,
  [`landlord-request-${randomUUID()}@gmail.com`, hash, role, active]);
  const row = result.rows[0];
  ids.push(row.id);
  return { ...row, token: auth.issueToken(row).token };
}
function call(method, path, user, body) {
  const req = api[method](`/api/v1${path}`);
  if (user) req.set('Authorization', `Bearer ${user.token}`);
  return body === undefined ? req : req.send(body);
}
async function submit(user, body = form) {
  const result = await call('post', '/landlord-requests', user, body);
  expect(result.status).toBe(201);
  return result.body.data.application;
}
const review = (admin, id, decision = 'approved', reason) => call('patch', `/admin/landlord-requests/${id}`, admin, { decision, ...(reason === undefined ? {} : { reason }) });
async function state(user) { return (await query('SELECT role, is_active FROM users WHERE id = $1', [user.id])).rows[0]; }
async function audits(user) { return (await query('SELECT * FROM admin_action_audits WHERE target_user_id = $1', [user.id])).rows; }

test('submitting contact details without a property address persists a pending request without changing the tenant role', async () => {
  const user = await account();
  const application = await submit(user, { ...form, contactName: `  ${form.contactName}  ` });
  expect(application).toMatchObject({ userId: user.id, contactName: form.contactName, status: 'pending', reviewedAt: null, rejectionReason: null });
  expect(application).not.toHaveProperty('password_hash');
  expect(application).not.toHaveProperty('propertyAddress');
  expect((await query('SELECT property_address FROM landlord_requests WHERE id = $1', [application.id])).rows[0].property_address).toBe('');
  expect((await state(user)).role).toBe('tenant');
  expect(await audits(user)).toHaveLength(0);
  const me = await call('get', '/landlord-requests/me', user);
  expect(me.body.data).toEqual({ application, currentRole: 'tenant' });
});

test('the own-status endpoint does not expose another applicant', async () => {
  const owner = await account();
  const other = await account();
  await submit(owner);
  expect((await call('get', '/landlord-requests/me', other)).body.data).toEqual({ application: null, currentRole: 'tenant' });
  expect((await call('get', `/landlord-requests/me?userId=${owner.id}`, other)).body.data.application).toBeNull();
});

test.each([
  {}, { ...form, contactName: ' ' }, { ...form, phone: '123' }, { ...form, phone: 'abc123456789' },
  { ...form, propertyAddress: '123 Legacy Street' }, { ...form, message: 'x'.repeat(1001) },
  { ...form, role: 'landlord' }, { ...form, userId: '1' }, { ...form, status: 'approved' },
])('malformed or privileged application fields are rejected before any insertion', async body => {
  const user = await account();
  const result = await call('post', '/landlord-requests', user, body);
  expect(result.status).toBe(400);
  expect(result.body.error.code).toBe('VALIDATION_ERROR');
  expect((await call('get', '/landlord-requests/me', user)).body.data.application).toBeNull();
  expect((await state(user)).role).toBe('tenant');
});

test('concurrent submissions serialize to exactly one pending application', async () => {
  const user = await account();
  const results = await Promise.all([call('post', '/landlord-requests', user, form), call('post', '/landlord-requests', user, form)]);
  expect(results.map(result => result.status).sort()).toEqual([201, 409]);
  expect(results.find(result => result.status === 409).body.error.code).toBe('REQUEST_PENDING');
  expect((await query('SELECT id FROM landlord_requests WHERE user_id = $1', [user.id])).rowCount).toBe(1);
});

test.each(['tenant', 'landlord'])('a %s cannot list applicants or review a request', async role => {
  const target = await account();
  const application = await submit(target);
  const actor = await account(role);
  expect((await call('get', '/admin/landlord-requests', actor)).status).toBe(403);
  expect((await review(actor, application.id)).status).toBe(403);
  expect((await state(target)).role).toBe('tenant');
});

test.each(['landlord', 'admin'])('%s accounts cannot submit tenant upgrade applications', async role => {
  const actor = await account(role);
  expect((await call('post', '/landlord-requests', actor, form)).status).toBe(403);
});

test('guests and inactive accounts cannot submit, read applicant data or review', async () => {
  expect((await call('post', '/landlord-requests', null, form)).status).toBe(401);
  expect((await call('get', '/landlord-requests/me')).status).toBe(401);
  expect((await call('get', '/admin/landlord-requests')).status).toBe(401);
  expect((await review(null, '1')).status).toBe(401);
  const inactive = await account('tenant', false);
  expect((await call('post', '/landlord-requests', inactive, form)).body.error.code).toBe('INACTIVE_ACCOUNT');
});

test('admin list returns contact details only to admins and validates its filter', async () => {
  const admin = await account('admin');
  const user = await account();
  const application = await submit(user);
  // Historical addresses remain stored, but no longer belong to the application API.
  await query('UPDATE landlord_requests SET property_address = $1 WHERE id = $2', ['123 Legacy Street', application.id]);
  const result = await call('get', '/admin/landlord-requests', admin);
  expect(result.status).toBe(200);
  const found = result.body.data.applications.find(row => row.id === application.id);
  expect(found).toMatchObject({ ...application, applicant: { email: user.email, role: 'tenant', isActive: true } });
  expect(found).not.toHaveProperty('propertyAddress');
  expect((await call('get', '/landlord-requests/me', user)).body.data.application).not.toHaveProperty('propertyAddress');
  expect((await query('SELECT property_address FROM landlord_requests WHERE id = $1', [application.id])).rows[0].property_address).toBe('123 Legacy Street');
  expect(JSON.stringify(result.body)).not.toMatch(/password|hash|token/i);
  expect((await call('get', '/admin/landlord-requests?status=unknown', admin)).status).toBe(400);
  expect((await call('get', '/admin/landlord-requests?status=pending&userId=1', admin)).status).toBe(400);
});

test('approval atomically saves the decision, promotes the account and writes one role audit', async () => {
  const admin = await account('admin');
  const user = await account();
  const application = await submit(user);
  const approved = await review(admin, application.id);
  expect(approved.status).toBe(200);
  expect(approved.body.data).toMatchObject({ changed: true, application: { status: 'approved' }, user: { id: user.id, role: 'landlord' } });
  const saved = (await query('SELECT * FROM landlord_requests WHERE id = $1', [application.id])).rows[0];
  expect(saved.reviewed_by).toBe(admin.id);
  expect(saved.reviewed_at).toBeInstanceOf(Date);
  const existingSession = await call('get', '/auth/me', user);
  expect(existingSession.body.data.role).toBe('landlord');
  expect((await call('get', '/landlord-requests/me', user)).body.data.currentRole).toBe('landlord');
  expect(await audits(user)).toMatchObject([{ actor_user_id: admin.id, target_user_id: user.id, previous_value: 'tenant', new_value: 'landlord' }]);
  const repeated = await review(admin, application.id);
  expect(repeated.body.data.changed).toBe(false);
  expect(await audits(user)).toHaveLength(1);
  expect((await review(admin, application.id, 'rejected', 'A conflicting decision')).status).toBe(409);
});

test('rejection keeps the tenant role, provides the reason and permits a new application', async () => {
  const admin = await account('admin');
  const user = await account();
  const first = await submit(user);
  for (const reason of [undefined, '', 'x']) expect((await review(admin, first.id, 'rejected', reason)).status).toBe(400);
  const rejected = await review(admin, first.id, 'rejected', 'Please update the contact information');
  expect(rejected.body.data.application.status).toBe('rejected');
  expect((await state(user)).role).toBe('tenant');
  expect(await audits(user)).toHaveLength(0);
  const second = await submit(user, { ...form, phone: '0909 876 543' });
  expect(second.id).not.toBe(first.id);
  expect((await call('get', '/landlord-requests/me', user)).body.data.application.id).toBe(second.id);
  expect((await review(admin, second.id)).status).toBe(200);
  expect((await state(user)).role).toBe('landlord');
});

test('inactive applicants cannot be approved', async () => {
  const admin = await account('admin');
  const user = await account();
  const application = await submit(user);
  await query('UPDATE users SET is_active = false WHERE id = $1', [user.id]);
  expect((await review(admin, application.id)).body.error.code).toBe('INACTIVE_ACCOUNT');
  expect((await state(user)).role).toBe('tenant');
  expect((await query('SELECT status FROM landlord_requests WHERE id = $1', [application.id])).rows[0].status).toBe('pending');
});

test.each([false, true])('a pending applicant promoted to admin cannot be approved but can be rejected without changing role (self-review: %s)', async self => {
  const user = await account();
  const application = await submit(user);
  const admin = self ? user : await account('admin');
  await query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  const blocked = await review(admin, application.id);
  expect(blocked.status).toBe(409);
  expect(blocked.body.error.code).toBe('REQUEST_INELIGIBLE');
  expect((await query('SELECT status FROM landlord_requests WHERE id = $1', [application.id])).rows[0].status).toBe('pending');
  expect((await state(user)).role).toBe('admin');
  expect(await audits(user)).toHaveLength(0);
  const rejected = await review(admin, application.id, 'rejected', 'Account already has administrator access');
  expect(rejected.status).toBe(200);
  expect(rejected.body.data).toMatchObject({ changed: true, application: { status: 'rejected' }, user: { role: 'admin' } });
  expect((await state(user)).role).toBe('admin');
  expect((await query('SELECT reviewed_by FROM landlord_requests WHERE id = $1', [application.id])).rows[0].reviewed_by).toBe(admin.id);
  expect(await audits(user)).toHaveLength(0);
});

test('concurrent opposing decisions commit one result without a second role audit', async () => {
  const admin = await account('admin');
  const user = await account();
  const application = await submit(user);
  const results = await Promise.all([review(admin, application.id), review(admin, application.id, 'rejected', 'Synthetic rejection reason')]);
  expect(results.map(result => result.status).sort()).toEqual([200, 409]);
  const status = (await query('SELECT status FROM landlord_requests WHERE id = $1', [application.id])).rows[0].status;
  expect((await state(user)).role).toBe(status === 'approved' ? 'landlord' : 'tenant');
  expect(await audits(user)).toHaveLength(status === 'approved' ? 1 : 0);
});

test('review revalidates administrator authorization inside its transaction', async () => {
  const actor = await account('tenant');
  const user = await account();
  const application = await submit(user);
  await expect(service.review(actor.id, application.id, { decision: 'approved' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  expect((await state(user)).role).toBe('tenant');
});

test('an audit write failure rolls back both the role and the approval', async () => {
  const admin = await account('admin');
  const user = await account();
  const application = await submit(user);
  const connect = pool.connect.bind(pool);
  jest.spyOn(pool, 'connect').mockImplementation(async () => {
    const client = await connect();
    const actual = client.query.bind(client);
    jest.spyOn(client, 'query').mockImplementation((sql, ...params) => sql.includes('INSERT INTO admin_action_audits')
      ? Promise.reject(new Error('Synthetic audit failure')) : actual(sql, ...params));
    return client;
  });
  await expect(service.review(admin.id, application.id, { decision: 'approved' })).rejects.toThrow('Synthetic audit failure');
  jest.restoreAllMocks();
  expect((await state(user)).role).toBe('tenant');
  expect((await query('SELECT status FROM landlord_requests WHERE id = $1', [application.id])).rows[0].status).toBe('pending');
});

test('the legacy role endpoint requires an application and records its approval atomically', async () => {
  const admin = await account('admin');
  const user = await account();
  expect((await call('patch', `/admin/users/${user.id}/role`, admin, { role: 'landlord' })).body.error.code).toBe('LANDLORD_REQUEST_REQUIRED');
  expect((await state(user)).role).toBe('tenant');
  const application = await submit(user);
  expect((await call('patch', `/admin/users/${user.id}/role`, admin, { role: 'landlord' })).status).toBe(200);
  expect((await query('SELECT status, reviewed_by FROM landlord_requests WHERE id = $1', [application.id])).rows[0])
    .toEqual({ status: 'approved', reviewed_by: admin.id });
});

test.each(['0', '01', '9223372036854775808', 'bad-id'])('invalid request ID is rejected safely: %s', async id => {
  const admin = await account('admin');
  expect((await review(admin, id)).status).toBe(400);
});

test('missing requests and unsupported review fields fail without role changes', async () => {
  const admin = await account('admin');
  expect((await review(admin, '9223372036854775807')).status).toBe(404);
  const user = await account();
  const application = await submit(user);
  expect((await call('patch', `/admin/landlord-requests/${application.id}`, admin, { decision: 'approved', role: 'admin' })).status).toBe(400);
  expect((await state(user)).role).toBe('tenant');
});
