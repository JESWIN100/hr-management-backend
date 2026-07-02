const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { createWorkingStage, getworking, updateWorkingStage, deleteWorkingStage } = require('../controllers/WorkingStages');


router.post('/', authenticate, createWorkingStage);
router.get('/',authenticate, getworking)
router.put('/:id',authenticate, updateWorkingStage)
router.delete('/:id',authenticate, deleteWorkingStage)
module.exports = router;

