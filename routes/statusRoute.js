const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');

const { getAllStatus, getworkfeasbility, getEmploymentStatus, getLeaveStatus } = require('../controllers/statusController');


router.get('/', authenticate, getAllStatus);
router.get('/workfesability', authenticate, getworkfeasbility);
router.get('/employement_status', authenticate, getEmploymentStatus);
router.get('/leavestatus', authenticate, getLeaveStatus);


module.exports = router;
