const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// GET /api/employees
const getAllEmployees = async (req, res) => {
  console.log("📥 INCOMING FRONTEND QUERY:", req.query);
  try {
    const { search, department_id, status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT e.*, d.department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (e.name LIKE ? OR e.email LIKE ? OR e.phone LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (department_id) {
      query += ' AND e.department_id = ?';
      params.push(department_id);
    }
    if (status) {
      query += ' AND e.employment_status = ?';
      params.push(status);
    }

    // Total count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM employees e WHERE 1=1${search ? ' AND (e.name LIKE ? OR e.email LIKE ? OR e.phone LIKE ?)' : ''}${department_id ? ' AND e.department_id = ?' : ''}${status ? ' AND e.employment_status = ?' : ''}`,
      params
    );

    query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const [rows] = await db.query(query, params);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: countRows[0].total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countRows[0].total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('Get employees error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/employees/:id
const getEmployeeById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*, d.department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Get employee error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/employees
const createEmployee = async (req, res) => {
  try {
    const {
      name, email, phone, department_id,
      designation, joining_date, employment_status, address,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    // Check duplicate email
    const [existing] = await db.query('SELECT id FROM employees WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Employee with this email already exists' });
    }

    const avatar = req.file ? `/uploads/${req.file.filename}` : null;

    console.log("avatar",avatar);
    

    const [result] = await db.query(
      `INSERT INTO employees
        (name, email, phone, department_id, designation, joining_date, employment_status, address, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, email, phone || null,
        department_id || null, designation || null,
        joining_date || null,
        employment_status || 'Active',
        address || null, avatar,
      ]
    );

    const [newEmployee] = await db.query(
      `SELECT e.*, d.department_name FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: newEmployee[0],
    });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, department_id,
      designation, joining_date, employment_status, address,
    } = req.body;

    const [existing] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check email uniqueness (exclude current)
    if (email) {
      const [dup] = await db.query('SELECT id FROM employees WHERE email = ? AND id != ?', [email, id]);
      if (dup.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already in use by another employee' });
      }
    }

    let avatar = existing[0].avatar;
    if (req.file) {
      // Delete old avatar if exists
      if (avatar) {
        const oldPath = path.join(__dirname, '../..', avatar);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      avatar = `/uploads/${req.file.filename}`;
    }

    await db.query(
      `UPDATE employees SET
        name = ?, email = ?, phone = ?, department_id = ?,
        designation = ?, joining_date = ?, employment_status = ?, address = ?, avatar = ?
       WHERE id = ?`,
      [
        name || existing[0].name,
        email || existing[0].email,
        phone ?? existing[0].phone,
        department_id ?? existing[0].department_id,
        designation ?? existing[0].designation,
        joining_date ?? existing[0].joining_date,
        employment_status || existing[0].employment_status,
        address ?? existing[0].address,
        avatar,
        id,
      ]
    );

    const [updated] = await db.query(
      `SELECT e.*, d.department_name FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updated[0],
    });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT avatar FROM employees WHERE id = ?', [id]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Delete avatar file if exists
    if (existing[0].avatar) {
      const filePath = path.join(__dirname, '../..', existing[0].avatar);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.query('DELETE FROM employees WHERE id = ?', [id]);

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
