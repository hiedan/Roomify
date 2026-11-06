const { Router } = require('express');
const controller = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
const landlordRequests = require('../controllers/landlordRequestController');

const router = Router();
router.get('/users/lookup', requireAuth, requireAdmin, controller.lookup);
router.get('/landlord-requests', requireAuth, requireAdmin, landlordRequests.list);
router.patch('/landlord-requests/:id', requireAuth, requireAdmin, landlordRequests.review);
router.patch('/users/:id/role', requireAuth, requireAdmin, controller.updateRole);
router.patch('/users/:id/status', requireAuth, requireAdmin, controller.updateStatus);

module.exports = router;
