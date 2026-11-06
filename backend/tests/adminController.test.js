jest.mock('../src/services/adminService', () => ({ findAccount: jest.fn(), changeRole: jest.fn(), changeStatus: jest.fn() }));

const service = require('../src/services/adminService');
const controller = require('../src/controllers/adminController');

beforeEach(() => jest.clearAllMocks());

test('lookup forwards only the search query and returns the service profile', async () => {
  const input = { identifier: 'synthetic@gmail.com' };
  const result = { user: { id: '9007199254740993' } };
  service.findAccount.mockResolvedValueOnce(result);
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  await controller.lookup({ query: input }, res, next);
  expect(service.findAccount).toHaveBeenCalledWith(input);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
  expect(next).not.toHaveBeenCalled();
});

test('lookup forwards failures to the existing error handler', async () => {
  const failure = new Error('Synthetic lookup failure');
  service.findAccount.mockRejectedValueOnce(failure);
  const next = jest.fn();
  await controller.lookup({ query: {} }, {}, next);
  expect(next).toHaveBeenCalledWith(failure);
});

test.each([['updateRole', 'changeRole'], ['updateStatus', 'changeStatus']])(
  '%s uses authenticated actor ID and forwards service result', async (handler, operation) => {
    const req = { user: { id: '9007199254740993' }, params: { id: '9223372036854775807' }, body: { example: true } };
    const result = { changed: true, user: { id: req.params.id } };
    service[operation].mockResolvedValue(result);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const next = jest.fn();
    await controller[handler](req, res, next);
    expect(service[operation]).toHaveBeenCalledWith(req.user.id, req.params.id, req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
    expect(next).not.toHaveBeenCalled();
  }
);

test.each([['updateRole', 'changeRole'], ['updateStatus', 'changeStatus']])(
  '%s forwards async failures to Express 4', async (handler, operation) => {
    const error = new Error('Synthetic admin failure');
    service[operation].mockRejectedValue(error);
    const next = jest.fn();
    await controller[handler]({ user: { id: '1' }, params: { id: '2' }, body: {} }, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(error);
  }
);
