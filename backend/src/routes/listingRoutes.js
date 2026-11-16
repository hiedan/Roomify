const { Router } = require('express');
const { requireAuth, requireRole, requireOwnership } = require('../middlewares/auth');
const controller = require('../controllers/listingController');

const router = Router();
router.get('/filters', controller.filters);
router.get('/', controller.search);
router.delete('/:id', requireAuth, requireRole('landlord'), requireOwnership, controller.remove);
module.exports = router;
