const express = require('express');
const router = express.Router();
const passController = require('../controllers/pass.controller');
const { verifyJWT, requireAdmin } = require('../middleware/auth.middleware');

// Public — anyone can browse pass types
router.get('/', passController.getAllPasses);
router.get('/:id', passController.getPassById);

// Admin only
router.post('/', verifyJWT, requireAdmin, passController.createPass);
router.put('/:id', verifyJWT, requireAdmin, passController.updatePass);
router.delete('/:id', verifyJWT, requireAdmin, passController.deletePass);

module.exports = router;
