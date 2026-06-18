const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
const authenticate = require('../middleware/auth');
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');
const upload = require('../config/multer');



router.get('/', authenticate, getAllEmployees);
router.get('/:id', authenticate, getEmployeeById);
router.post('/', authenticate, upload.single('avatar'), createEmployee);
router.put('/edit/:id', authenticate, upload.single('avatar'), updateEmployee);
router.delete('/:id', authenticate, deleteEmployee);

module.exports = router;