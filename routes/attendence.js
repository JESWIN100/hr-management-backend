



    const express = require('express');
    const router = express.Router();

    const authenticate = require('../middleware/auth');
const { getallattendence, getOneEmployeeAttendance, getYearlyEmployeeAttendance } = require('../controllers/attendence');
    
   
    router.get('/',authenticate,getallattendence)

    router.get('/employee/:id/monthly', getOneEmployeeAttendance);
    router.get('/employee/:id/yearly', getYearlyEmployeeAttendance);
    module.exports = router;
    