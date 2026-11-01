jest.mock('../src/database/users', () => ({ create: jest.fn(), findByEmail: jest.fn(), findById: jest.fn() }));
const users = require('../src/database/users');
const auth = require('../src/services/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
beforeEach(() => jest.clearAllMocks());
test('registration hashes password and converts unique conflict', async () => {
  users.create.mockRejectedValueOnce({ code: '23505' });
  await expect(auth.register({ fullName: 'Test', email: 'test@gmail.com', password: 'password123' }))
    .rejects.toMatchObject({ status: 409, code: 'EMAIL_EXISTS' });
  expect(await bcrypt.compare('password123', users.create.mock.calls[0][0].passwordHash)).toBe(true);
});
test('expired token never queries database', async () => {
  const token = jwt.sign({}, config.jwtSecret, { subject: '1', expiresIn: -1 });
  await expect(auth.authenticate(token)).rejects.toMatchObject({ status: 401 });
  expect(users.findById).not.toHaveBeenCalled();
});
