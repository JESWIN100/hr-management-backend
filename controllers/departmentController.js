const db = require('../config/db');

// GET /api/departments
const getAllDepartments = async (req, res) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT d.*, COUNT(e.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (d.department_name LIKE ? OR d.department_head LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
    }

    query += ' GROUP BY d.id ORDER BY d.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/departments/:id
const getDepartmentById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*, COUNT(e.id) as employee_count
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id
       WHERE d.id = ?
       GROUP BY d.id`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Get department error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/departments
const createDepartment = async (req, res) => {
  try {
    const { department_name, department_head } = req.body;

    if (!department_name) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const [existing] = await db.query(
      'SELECT id FROM departments WHERE department_name = ?',
      [department_name]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Department already exists' });
    }

    const [result] = await db.query(
      'INSERT INTO departments (department_name, department_head) VALUES (?, ?)',
      [department_name, department_head || null]
    );

    const [newDept] = await db.query(
      'SELECT * FROM departments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: newDept[0],
    });
  } catch (err) {
    console.error('Create department error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/departments/:id
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, department_head } = req.body;

    const [existing] = await db.query('SELECT * FROM departments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    if (department_name && department_name !== existing[0].department_name) {
      const [dup] = await db.query(
        'SELECT id FROM departments WHERE department_name = ? AND id != ?',
        [department_name, id]
      );
      if (dup.length > 0) {
        return res.status(409).json({ success: false, message: 'Department name already in use' });
      }
    }

    await db.query(
      'UPDATE departments SET department_name = ?, department_head = ? WHERE id = ?',
      [
        department_name || existing[0].department_name,
        department_head ?? existing[0].department_head,
        id,
      ]
    );

    const [updated] = await db.query('SELECT * FROM departments WHERE id = ?', [id]);
    res.json({
      success: true,
      message: 'Department updated successfully',
      data: updated[0],
    });
  } catch (err) {
    console.error('Update department error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/departments/:id
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT id FROM departments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Check if employees are linked
    const [employees] = await db.query(
      'SELECT COUNT(*) as count FROM employees WHERE department_id = ?',
      [id]
    );
    if (employees[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${employees[0].count} employee(s) are assigned to this department`,
      });
    }

    await db.query('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (err) {
    console.error('Delete department error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
