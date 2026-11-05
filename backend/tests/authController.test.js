jest.mock('../src/services/authAccountService', () => ({
  registerAccount: jest.fn(), authenticateAccount: jest.fn(),
}));

const accounts = require('../src/services/authAccountService');
const controller = require('../src/controllers/authController');

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

test.each([['register', 'registerAccount', 201], ['login', 'authenticateAccount', 200]])(
  '%s sends the service result using the standard response', async (handler, service, status) => {
    const body = { email: 'synthetic@gmail.com', password: 'synthetic-input' };
    const result = { user: { id: '1', role: 'tenant' }, token: 'synthetic-session', expiresIn: 3600 };
    accounts[service].mockResolvedValue(result);
    const res = response();
    const next = jest.fn();
    await controller[handler]({ body }, res, next);
    expect(accounts[service]).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    expect(next).not.toHaveBeenCalled();
  }
);

test.each([['register', 'registerAccount'], ['login', 'authenticateAccount']])(
  '%s forwards rejected async work to Express 4', async (handler, service) => {
    const error = new Error('Synthetic service failure');
    accounts[service].mockRejectedValue(error);
    const res = response();
    const next = jest.fn();
    await controller[handler]({ body: {} }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  }
);

test('me returns the identity already loaded by requireAuth', () => {
  const user = { id: '9007199254740993', fullName: 'Synthetic User', email: 'synthetic@gmail.com',
    role: 'landlord', isActive: true };
  const res = response();
  controller.me({ user }, res);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: user });
});

test('logout acknowledges ending browser state without issuing a new token', () => {
  const res = response();
  controller.logout({}, res);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: { loggedOut: true } });
});
