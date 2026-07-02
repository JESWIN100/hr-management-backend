
const db = require('../config/db');

const createWorkingStage=async (req, res) => {
  try {
    const { name } = req.body;

    // Basic validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Stage name is required.' });
    }

    // Insert into database
    // id is AUTO_INCREMENT and created_at defaults to current_timestamp
    const query = 'INSERT INTO project_workingstage (name) VALUES (?)';
    const [result] = await db.execute(query, [name]);

    res.status(201).json({ 
      message: 'Working stage added successfully', 
      id: result.insertId 
    });

  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'An error occurred while saving to the database.' });
  }
}

const getworking=async (req, res) => {
  try {
    // Fetch all stages, ordered by the newest first
    const query = 'SELECT * FROM project_workingstage ORDER BY id DESC';
    const [rows] = await db.execute(query);
    
    res.status(200).json(rows);
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to fetch working stages.' });
  }
}


const updateWorkingStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Stage name is required.' });
    }

    const query = 'UPDATE project_workingstage SET name = ? WHERE id = ?';
    const [result] = await db.execute(query, [name, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Stage not found.' });
    }

    res.status(200).json({ message: 'Working stage updated successfully' });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to update working stage.' });
  }
};

const deleteWorkingStage = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM project_workingstage WHERE id = ?';
    const [result] = await db.execute(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Stage not found.' });
    }

    res.status(200).json({ message: 'Working stage deleted successfully' });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to delete working stage.' });
  }
};

module.exports = {
  createWorkingStage,
  getworking,
  updateWorkingStage,
  deleteWorkingStage
};