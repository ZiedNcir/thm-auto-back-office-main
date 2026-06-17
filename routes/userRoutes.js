const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protectAndAdmin } = require('../middleware/authMiddleware');
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.get('/users', authController.getAllUsers);
router.get('/users/:id', authController.getUserById);
router.put('/users/:id', authController.updateUser);
router.delete('/users/:id', authController.deleteUserAny);
router.put('/change-password-username', authController.changePasswordByUsername);


router.post('/admin/add-sous-admin', protectAndAdmin, authController.adminAddSousAdmin);

module.exports = router;