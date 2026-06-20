const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getAllRoles } = require('../controllers/roleController');


router.get('/', authenticate, getAllRoles);

module.exports = router;
