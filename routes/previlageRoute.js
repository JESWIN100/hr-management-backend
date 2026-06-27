
    const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');   
const { getallmenu, savePrivileges,getUsersPrivilage,getUserPrivileges } = require('../controllers/previlageController');


router.get('/menu', authenticate, getallmenu);
router.post('/save', authenticate, savePrivileges);
router.get('/users/list', authenticate, getUsersPrivilage);
router.get('/:userId', authenticate, getUserPrivileges);

module.exports = router;
