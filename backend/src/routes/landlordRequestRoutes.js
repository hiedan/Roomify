const { Router } = require('express');
const controller = require('../controllers/landlordRequestController');
const { requireAuth, requireRole } = require('../middlewares/auth');

const router = Router();
router.get('/me', requireAuth, controller.latest);
router.post('/', requireAuth, requireRole('tenant'), controller.submit);

module.exports = router;
