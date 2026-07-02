
    const express = require('express');
    const router = express.Router();

    const authenticate = require('../middleware/auth');
const { getallattendence, getOneEmployeeAttendance, getYearlyEmployeeAttendance, updateAttendance, getAttendanceLogs, getDashboardStats } = require('../controllers/attendence');
    
   
    router.get('/',authenticate,getallattendence)
    router.get('/logs',authenticate,getAttendanceLogs)
    router.get('/chart',authenticate,getDashboardStats)
router.put('/update', updateAttendance)
    router.get('/employee/:id/monthly', getOneEmployeeAttendance);
    router.get('/employee/:id/yearly', getYearlyEmployeeAttendance);


    module.exports = router;
    