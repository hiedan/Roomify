const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { query } = require('../src/db');
const { resetDb } = require('./helpers');
const api = request(createApp());
const account = { fullName: 'Minh Khang', email: 'roomify.test@gmail.com', password: 'Roomify123!' };
beforeEach(resetDb);

test('register hashes password, normalizes Gmail and returns a safe tenant session', async () => {
  const res = await api.post('/api/v1/auth/register').send({ ...account, email: ' ROOMIFY.TEST@GMAIL.COM ' });
  expect(res.status).toBe(201);
  expect(res.body.error).toBeNull();
  expect(res.body.data.user).toEqual({ id: expect.any(String), fullName: account.fullName, email: account.email, role: 'tenant' });
  const { rows } = await query('SELECT password_hash FROM users WHERE email = $1', [account.email]);
  expect(await bcrypt.compare(account.password, rows[0].password_hash)).toBe(true);
  expect(JSON.stringify(res.body)).not.toContain('password');
  const me = await api.get('/api/v1/auth/me').set('Authorization', 'Bearer ' + res.body.data.token);
  expect(me.status).toBe(200);
  expect(me.body.data.user.email).toBe(account.email);
});
test('duplicate Gmail returns 409', async () => {
  await api.post('/api/v1/auth/register').send(account);
  expect((await api.post('/api/v1/auth/register').send(account)).status).toBe(409);
});
test.each([
  { ...account, email: 'test@yahoo.com' }, { ...account, password: 'short' },
  { ...account, role: 'admin' }, { ...account, fullName: ' ' },
  { ...account, password: 'đ'.repeat(40) },
])('rejects invalid registration or injected role', async (body) => {
  const res = await api.post('/api/v1/auth/register').send(body);
  expect(res.status).toBe(400);
  expect(res.body.data).toBeNull();
});
test('login, wrong credentials, disabled account, and protected endpoint', async () => {
  await api.post('/api/v1/auth/register').send(account);
  const credentials = { email: account.email, password: account.password, remember: true };
  const res = await api.post('/api/v1/auth/login').send(credentials);
  expect(res.status).toBe(200);
  expect(res.body.data.token).toEqual(expect.any(String));
  expect((await api.post('/api/v1/auth/login').send({ ...credentials, password: 'wrongpass' })).status).toBe(401);
  expect((await api.post('/api/v1/auth/login').send({ ...credentials, email: 'unknown@gmail.com' })).status).toBe(401);
  expect((await api.post('/api/v1/auth/login').send({ email: 'bad' })).status).toBe(400);
  expect((await api.get('/api/v1/auth/me')).status).toBe(401);
  expect((await api.get('/api/v1/auth/me').set('Authorization', 'Bearer broken')).status).toBe(401);
  await query('UPDATE users SET is_active = false WHERE email = $1', [account.email]);
  expect((await api.post('/api/v1/auth/login').send(credentials)).status).toBe(403);
  expect((await api.get('/api/v1/auth/me').set('Authorization', 'Bearer ' + res.body.data.token)).status).toBe(403);
});
