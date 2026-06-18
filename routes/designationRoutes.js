const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  getAllDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} = require('../controllers/designationController');

router.get('/', authenticate, getAllDesignations);
router.get('/:id', authenticate, getDesignationById);
router.post('/', authenticate, createDesignation);
router.put('/edit/:id', authenticate, updateDesignation);
router.delete('/:id', authenticate, deleteDesignation);

module.exports = router;
