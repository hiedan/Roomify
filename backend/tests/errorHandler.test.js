const { z } = require('zod');
const { inspect } = require('util');
const AppError = require('../src/utils/AppError');
const { errorHandler, notFound } = require('../src/middlewares/errorHandler');

let errorLog;
beforeEach(() => { errorLog = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

function respond(error) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  errorHandler(error, {}, res, next);
  expect(res.status).toHaveBeenCalledTimes(1);
  expect(res.json).toHaveBeenCalledTimes(1);
  expect(next).not.toHaveBeenCalled();
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

test.each([
  [400, 'VALIDATION_ERROR'], [401, 'UNAUTHORIZED'], [401, 'INVALID_CREDENTIALS'],
  [403, 'INACTIVE_ACCOUNT'], [403, 'FORBIDDEN'], [404, 'NOT_FOUND'],
  [409, 'EMAIL_CONFLICT'], [500, 'AUTH_CONFIG_ERROR'],
])('preserves trusted AppError %i/%s without logging', (status, code) => {
  expect(respond(new AppError(status, code, 'Safe application message'))).toEqual({
    status, body: { success: false, error: { code, message: 'Safe application message' } },
  });
  expect(errorLog).not.toHaveBeenCalled();
});

test('unexpected DB errors expose no SQL, credentials, hash, token, connection string or stack in response/logs', () => {
  const marker = 'synthetic-private-marker';
  const error = Object.assign(new Error(marker), {
    code: '23502', detail: `Failing row contains password_hash=${marker}`,
    query: `UPDATE users SET password_hash='${marker}'`,
    connectionString: `postgresql://user:${marker}@db.bbbbbbbbbbbbbbbbbbbb.supabase.co/postgres`,
    token: `header.${marker}.signature`, stack: `Sensitive stack ${marker}`,
  });
  const result = respond(error);
  expect(result).toEqual({ status: 500, body: {
    success: false, error: { code: 'INTERNAL', message: 'Internal server error' },
  } });
  expect(errorLog).toHaveBeenCalledTimes(1);
  expect(inspect(errorLog.mock.calls, { depth: null }).includes(marker)).toBe(false);
  expect(JSON.stringify(result).includes(marker)).toBe(false);
});

test('malformed JSON does not echo the parser body or stack', () => {
  const result = respond(Object.assign(new SyntaxError('Synthetic private parser data'), {
    type: 'entity.parse.failed', body: 'Synthetic private parser data',
  }));
  expect(result).toEqual({ status: 400, body: {
    success: false, error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' },
  } });
  expect(errorLog).not.toHaveBeenCalled();
});

test('strict-schema errors do not reflect an arbitrary secret-shaped field name', () => {
  const marker = 'synthetic-private-field';
  const parsed = z.object({ role: z.enum(['tenant', 'landlord']) }).strict()
    .safeParse({ role: 'tenant', [marker]: 'value' });
  const result = respond(parsed.error);
  expect(result.status).toBe(400);
  expect(result.body.error.code).toBe('VALIDATION_ERROR');
  expect(result.body.error.message.includes(marker)).toBe(false);
  expect(result.body.error.message).toContain('Unsupported');
});

test('enum validation identifies the field without reflecting the rejected value', () => {
  const marker = 'synthetic-private-enum';
  const parsed = z.object({ role: z.enum(['tenant', 'landlord']) }).strict().safeParse({ role: marker });
  const result = respond(parsed.error);
  expect(result.status).toBe(400);
  expect(result.body.error.message).toContain('role');
  expect(result.body.error.message.includes(marker)).toBe(false);
});

test('404 errors never reflect request paths or query credentials', () => {
  const next = jest.fn();
  const marker = 'synthetic-private-url';
  notFound({ method: 'GET', originalUrl: `/missing/${marker}?token=${marker}` }, {}, next);
  expect(next).toHaveBeenCalledTimes(1);
  const error = next.mock.calls[0][0];
  expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  expect(error.message.includes(marker)).toBe(false);
  expect(respond(error).body.error.code).toBe('NOT_FOUND');
});
