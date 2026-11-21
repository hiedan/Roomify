const { Router } = require('express');
const { requireAuth, requireRole, requireOwnership } = require('../middlewares/auth');
const controller = require('../controllers/listingController');

const router = Router();

router.get('/filters', controller.filters);
router.get('/', controller.search);
router.post('/', requireAuth, requireRole('landlord'), controller.create);
router.get('/mine', requireAuth, requireRole('landlord'), controller.mine);
router.get('/mine/:id', requireAuth, requireRole('landlord'), requireOwnership, controller.mineDetail);
router.get('/:id', controller.detail);
router.patch('/:id', requireAuth, requireRole('landlord'), requireOwnership, controller.update);
router.delete('/:id', requireAuth, requireRole('landlord'), requireOwnership, controller.remove);

module.exports = router;
