const { Router } = require('express');
const controller = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

const router = Router();
router.patch('/users/:id/role', requireAuth, requireAdmin, controller.updateRole);
router.patch('/users/:id/status', requireAuth, requireAdmin, controller.updateStatus);

module.exports = router;
