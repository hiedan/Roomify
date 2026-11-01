const { Router } = require('express');
const { z } = require('zod');
const controller = require('../controllers/listings');
const asyncHandler = require('../utils/asyncHandler');

const schema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();
const router = Router();
router.get('/', (req, _res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) return next(result.error);
  req.query = result.data;
  next();
}, asyncHandler(controller.list));
module.exports = router;
