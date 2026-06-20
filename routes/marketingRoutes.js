require('dotenv').config();
const express = require('express');
const router = express.Router();

const { createaavisit, getallvisit, getvisitbyid, clientvisitedit, clientdelete, getVisitsByUserId } = require('../controllers/marketingController');
const authenticate = require('../middleware/auth');




router.post('/add',authenticate, createaavisit);
router.get('/',authenticate, getallvisit);
router.get('/:id',authenticate, getVisitsByUserId);
router.put('/edit/:id',authenticate, clientvisitedit);
router.delete('/ :id',authenticate, clientdelete);


module.exports = router;