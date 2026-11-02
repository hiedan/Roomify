const request = require('supertest');
const { createApp } = require('../src/app');

const api = request(createApp());

test('GET /api/v1/health returns success', async () => {
  const res = await api.get('/api/v1/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ success: true, data: { status: 'ok' } });
});

test('unknown route returns 404 in the standard error shape', async () => {
  const res = await api.get('/api/v1/khong-co');
  expect(res.status).toBe(404);
  expect(res.body).toEqual({
    success: false,
    error: { code: 'NOT_FOUND', message: expect.any(String) },
  });
});

test('malformed JSON body returns 400 VALIDATION_ERROR', async () => {
  const res = await api
    .post('/api/v1/health')
    .set('Content-Type', 'application/json')
    .send('{bad json');
  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
});
