const express = require('express');
const router = express.Router();
const { submitLeaveRequest, getAllLeaveTypes, getLeaveHistory, getAllLeaveRequests, updateLeaveStatus } = require('../controllers/leaveController');
    const authenticate = require('../middleware/auth');
// POST route for submitting a leave request
router.post('/request',authenticate, submitLeaveRequest);
router.get('/types', getAllLeaveTypes);
router.get('/history/:employeeId', getLeaveHistory);

router.get('/requests', getAllLeaveRequests);
router.put('/update-status/:requestId', updateLeaveStatus);

module.exports = router;