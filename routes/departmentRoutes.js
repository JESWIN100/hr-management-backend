const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');

router.get('/', authenticate, getAllDepartments);
router.get('/:id', authenticate, getDepartmentById);
router.post('/', authenticate, createDepartment);
router.put('/edit/:id', authenticate, updateDepartment);
router.delete('/:id', authenticate, deleteDepartment);

module.exports = router;
