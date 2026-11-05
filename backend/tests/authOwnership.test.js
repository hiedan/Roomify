jest.mock('../src/db', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));

const db = require('../src/db');
const AppError = require('../src/utils/AppError');
const { requireOwnership } = require('../src/middlewares/auth');

const OWNER_ID = '9007199254740993';
const LISTING_ID = '9223372036854775807';
const OWNER = { id: OWNER_ID, role: 'landlord', isActive: true };

beforeEach(() => {
  jest.clearAllMocks();
  db.query.mockResolvedValue({ rows: [{ owner_id: OWNER_ID }] });
});

async function invoke(extra = {}) {
  const req = { user: { ...OWNER }, params: { id: LISTING_ID }, ...extra };
  const next = jest.fn();
  await requireOwnership(req, {}, next);
  expect(next).toHaveBeenCalledTimes(1);
  return { req, next, error: next.mock.calls[0][0] };
}

function expectError(result, status, code) {
  expect(result.error).toBeInstanceOf(AppError);
  expect(result.error).toMatchObject({ status, code });
}

test('loads only the stored owner with a parameterized exact BIGINT listing ID', async () => {
  const result = await invoke({ body: { owner_id: '2', userId: '2' }, query: { owner_id: '2' } });
  expect(result.next).toHaveBeenCalledWith();
  expect(db.query).toHaveBeenCalledTimes(1);
  const [sql, params] = db.query.mock.calls[0];
  expect(sql).toMatch(/^SELECT owner_id FROM listings WHERE id = \$1$/i);
  expect(sql).not.toContain(LISTING_ID);
  expect(sql).not.toMatch(/password|\*/i);
  expect(params).toEqual([LISTING_ID]);
  expect(result.req.user.id).toBe(OWNER_ID);
});

test.each(['tenant', 'landlord', 'admin'])(
  'ownership alone admits the stored owner with role %s; role policy is separate', async (role) => {
    expect((await invoke({ user: { ...OWNER, role } })).next).toHaveBeenCalledWith();
  }
);

test.each(['tenant', 'landlord', 'admin'])(
  'a non-owner with role %s cannot spoof ownership through body or query', async (role) => {
    expectError(await invoke({
      user: { ...OWNER, id: '9007199254740992', role },
      body: { owner_id: '9007199254740992', userId: OWNER_ID, role: 'admin' },
      query: { owner_id: '9007199254740992' },
    }), 403, 'FORBIDDEN');
  }
);

test.each([
  undefined, null, {}, { role: 'landlord', isActive: true },
  { ...OWNER, id: 9007199254740992 }, { ...OWNER, id: '0' },
  { ...OWNER, id: '9223372036854775808' }, { ...OWNER, isActive: 'true' },
])('missing/invalid authenticated identity is rejected before DB access', async (user) => {
  expectError(await invoke({ user, body: { user: OWNER } }), 401, 'UNAUTHORIZED');
  expect(db.query).not.toHaveBeenCalled();
});

test('inactive identity is denied before DB access', async () => {
  expectError(await invoke({ user: { ...OWNER, isActive: false } }), 403, 'INACTIVE_ACCOUNT');
  expect(db.query).not.toHaveBeenCalled();
});

test.each([
  undefined, null, '', '0', '-1', '01', '+1', '1.5', '1e3', ' 1 ',
  "1' OR 1=1 --", 1, [], {}, '9223372036854775808', '9'.repeat(100),
])('invalid listing ID is a validation error before DB access: %p', async (id) => {
  expectError(await invoke({ params: { id } }), 400, 'VALIDATION_ERROR');
  expect(db.query).not.toHaveBeenCalled();
});

test('a missing params object is a validation error', async () => {
  expectError(await invoke({ params: undefined }), 400, 'VALIDATION_ERROR');
  expect(db.query).not.toHaveBeenCalled();
});

test('a missing listing returns NOT_FOUND', async () => {
  db.query.mockResolvedValue({ rows: [] });
  expectError(await invoke(), 404, 'NOT_FOUND');
});

test.each(['1', '9007199254740993', '9223372036854775807'])(
  'preserves the valid listing ID %s', async (id) => {
    expect((await invoke({ params: { id } })).next).toHaveBeenCalledWith();
    expect(db.query.mock.calls[0][1]).toEqual([id]);
  }
);

test('re-reads ownership on each invocation instead of caching the owner', async () => {
  expect((await invoke()).next).toHaveBeenCalledWith();
  db.query.mockResolvedValue({ rows: [{ owner_id: '9007199254740992' }] });
  expectError(await invoke(), 403, 'FORBIDDEN');
  expect(db.query).toHaveBeenCalledTimes(2);
});

test.each(['ECONNRESET', '42501', '22P02'])(
  'forwards the original DB error (%s) through next', async (code) => {
    const error = Object.assign(new Error('Synthetic ownership DB failure'), { code });
    db.query.mockRejectedValue(error);
    expect((await invoke()).error).toBe(error);
  }
);
