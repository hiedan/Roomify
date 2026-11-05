jest.mock('../src/db', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));

const db = require('../src/db');
const { requireRole, requireAdmin } = require('../src/middlewares/auth');

function invoke(guard, user, extra = {}) {
  const next = jest.fn();
  guard({ user, ...extra }, {}, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(db.query).not.toHaveBeenCalled();
  return next;
}

test.each([
  ['tenant', 'tenant', true], ['tenant', 'landlord', false], ['tenant', 'admin', false],
  ['landlord', 'tenant', false], ['landlord', 'landlord', true], ['landlord', 'admin', false],
  ['admin', 'tenant', false], ['admin', 'landlord', false], ['admin', 'admin', true],
])('role %s requesting %s-only access: allowed=%s', (role, required, allowed) => {
  const next = invoke(requireRole(required), { id: '9007199254740993', role, isActive: true });
  if (allowed) expect(next).toHaveBeenCalledWith();
  else expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403, code: 'FORBIDDEN' }));
});

test.each([undefined, null, {}, { role: 'admin', isActive: true },
  { id: '', role: 'admin', isActive: true }, { id: '1', role: 'admin' }])(
  'requires a valid authenticated identity: %p', (user) => {
    for (const guard of [requireRole('tenant'), requireAdmin]) {
      expect(invoke(guard, user, {
        body: { user: { id: '1', role: 'admin', isActive: true }, role: 'admin' },
        query: { role: 'admin' }, headers: { authorization: 'Bearer client-supplied' },
      })).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: 'UNAUTHORIZED' }));
    }
  }
);

test.each(['tenant', 'landlord', 'admin'])(
  'requireAdmin admits only active admins: %s', (role) => {
    const next = invoke(requireAdmin, { id: '1', role, isActive: true });
    if (role === 'admin') expect(next).toHaveBeenCalledWith();
    else expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403, code: 'FORBIDDEN' }));
    expect(invoke(requireAdmin, { id: '1', role, isActive: false }))
      .toHaveBeenCalledWith(expect.objectContaining({ status: 403, code: 'INACTIVE_ACCOUNT' }));
  }
);

test('allows an explicit list of roles without adding admin inheritance', () => {
  const guard = requireRole('tenant', 'landlord');
  for (const role of ['tenant', 'landlord']) {
    expect(invoke(guard, { id: '1', role, isActive: true })).toHaveBeenCalledWith();
  }
  expect(invoke(guard, { id: '1', role: 'admin', isActive: true }))
    .toHaveBeenCalledWith(expect.objectContaining({ status: 403, code: 'FORBIDDEN' }));
});

test('unknown account roles fail closed', () => {
  expect(invoke(requireAdmin, { id: '1', role: 'superuser', isActive: true }))
    .toHaveBeenCalledWith(expect.objectContaining({ status: 403, code: 'FORBIDDEN' }));
});

test.each([[], ['guest'], ['admin', 'typo'], [null]])(
  'rejects a misconfigured role policy: %p', (...roles) => {
    expect(() => requireRole(...roles)).toThrow(TypeError);
  }
);
