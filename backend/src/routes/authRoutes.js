const { Router } = require('express');
const controller = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');

const router = Router();
router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', requireAuth, controller.me);
// Idempotent and usable after expiry: ending browser state needs no valid JWT.
router.post('/logout', controller.logout);

module.exports = router;
