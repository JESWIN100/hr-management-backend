const db = require('../config/db');

// GET /api/designations
const getAllDesignations = async (req, res) => {
  try {
    const { search } = req.query;

    let query = 'SELECT * FROM designations WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (designation_name LIKE ? OR report_to LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get designations error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/designations/:id
const getDesignationById = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM designations WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Get designation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/designations
const createDesignation = async (req, res) => {
  try {
    const { designation_name, report_to } = req.body;

    if (!designation_name) {
      return res.status(400).json({ success: false, message: 'Designation name is required' });
    }

    const [existing] = await db.query(
      'SELECT id FROM designations WHERE designation_name = ?',
      [designation_name]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Designation already exists' });
    }

    const [result] = await db.query(
      'INSERT INTO designations (designation_name, report_to) VALUES (?, ?)',
      [designation_name, report_to || null]
    );

    const [newDesig] = await db.query(
      'SELECT * FROM designations WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Designation created successfully',
      data: newDesig[0],
    });
  } catch (err) {
    console.error('Create designation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/designations/:id
const updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { designation_name, report_to } = req.body;

    const [existing] = await db.query('SELECT * FROM designations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    if (designation_name && designation_name !== existing[0].designation_name) {
      const [dup] = await db.query(
        'SELECT id FROM designations WHERE designation_name = ? AND id != ?',
        [designation_name, id]
      );
      if (dup.length > 0) {
        return res.status(409).json({ success: false, message: 'Designation name already in use' });
      }
    }

    await db.query(
      'UPDATE designations SET designation_name = ?, report_to = ? WHERE id = ?',
      [
        designation_name || existing[0].designation_name,
        report_to ?? existing[0].report_to,
        id,
      ]
    );

    const [updated] = await db.query('SELECT * FROM designations WHERE id = ?', [id]);
    res.json({
      success: true,
      message: 'Designation updated successfully',
      data: updated[0],
    });
  } catch (err) {
    console.error('Update designation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/designations/:id
const deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT id FROM designations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    await db.query('DELETE FROM designations WHERE id = ?', [id]);
    res.json({ success: true, message: 'Designation deleted successfully' });
  } catch (err) {
    console.error('Delete designation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllDesignations,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
};
