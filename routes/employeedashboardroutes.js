const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getMyDashboard } = require('../controllers/employeeDashboardController');

router.get('/me', authenticate, getMyDashboard);

module.exports = router;
