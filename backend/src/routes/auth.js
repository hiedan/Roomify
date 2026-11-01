const { Router } = require('express');
const { z } = require('zod');
const controller = require('../controllers/auth');
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middlewares/authenticate');

const email = z.string().trim().toLowerCase().email().max(255)
  .refine((value) => value.endsWith('@gmail.com'), 'Vui lòng sử dụng địa chỉ @gmail.com');
const password = z.string().min(8).max(72)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Mật khẩu tối đa 72 byte');
const registerSchema = z.object({ fullName: z.string().trim().min(2).max(100), email, password }).strict();
const loginSchema = z.object({ email, password, remember: z.boolean().optional().default(false) }).strict();
const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return next(result.error);
  req.body = result.data;
  next();
};
const router = Router();
router.post('/register', validate(registerSchema), asyncHandler(controller.register));
router.post('/login', validate(loginSchema), asyncHandler(controller.login));
router.get('/me', asyncHandler(authenticate), asyncHandler(controller.me));
module.exports = router;
