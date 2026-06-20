const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getAllLeadTypes } = require('../controllers/leadtypeController');


router.get('/', authenticate, getAllLeadTypes);

module.exports = router;
