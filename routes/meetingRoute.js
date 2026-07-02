const express = require('express');
const { createMeeting, getmeeting } = require('../controllers/meetingController');
const router = express.Router();

// POST route for submitting a leave request
// router.post('/request',authenticate, submitLeaveRequest);
router.get('/google-meet/start',createMeeting)
router.get('/active/:project_id',getmeeting)

module.exports = router;