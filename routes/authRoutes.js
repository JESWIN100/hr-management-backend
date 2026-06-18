const express = require('express');
const router = express.Router();
const { login, signup, getMe } = require('../controllers/authController');
const authenticate = require('../middleware/auth');

router.post('/login', login);
router.post('/signup', signup);
router.get('/me', authenticate, getMe);

module.exports = router;
