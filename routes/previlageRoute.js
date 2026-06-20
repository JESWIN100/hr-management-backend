
    const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');   
const { getallmenu, savePrivileges } = require('../controllers/previlageController');


router.get('/menu', authenticate, getallmenu);
router.post('/save', authenticate, savePrivileges);

module.exports = router;
