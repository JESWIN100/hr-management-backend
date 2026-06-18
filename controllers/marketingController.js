require('dotenv').config();
const db = require('../config/db');





const createaavisit = async (req, res) => {
const user_id = req.user.id
console.log("user_id",user_id);


  try {
    const {
      clientName, leadType, status, visitDate, purposeOfVisit, 
      workFeasibility, clientRemarks, clientPreferredTime, nextMeetingDate
    } = req.body;



    if (!clientName) {
      return res.status(400).json({ error: 'Client Name is required' });
    }

    const query = `
      INSERT INTO client_visits 
      (user_id,clientName, leadType, status, visitDate, purposeOfVisit, workFeasibility, clientRemarks, clientPreferredTime, nextMeetingDate) 
      VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
     user_id, clientName, leadType, status, visitDate || null, purposeOfVisit,
      workFeasibility, clientRemarks, clientPreferredTime, nextMeetingDate || null
    ];

    const [result] = await db.execute(query, values);

    res.status(201).json({ 
      message: 'Client visit recorded successfully', 
      insertId: result.insertId 
    });
  } catch (error) {
    console.error('Error saving client visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 

const getallvisit = async (req, res) => {
  try {
    // Extract user info provided by your authenticate middleware
    const userId = req.user.id;
    const userRole = req.user.role; // Assume your token payload has a 'role' property

    let query;
    let values = [];

    // Check if the user is an admin
    if (userRole === 'admin') {
      // Admin sees everything
      query = 'SELECT * FROM client_visits ORDER BY created_at DESC';
    } else {
      // Regular user sees only their own visits
      query = 'SELECT * FROM client_visits WHERE user_id = ? ORDER BY created_at DESC';
      values = [userId];
    }

    const [rows] = await db.execute(query, values);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getvisitbyid = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM client_visits WHERE id = ?';
    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Visit record not found' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; // <-- Fixed syntax

const clientvisitedit = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      clientName, leadType, status, visitDate, purposeOfVisit, 
      workFeasibility, clientRemarks, clientPreferredTime, nextMeetingDate
    } = req.body;

    if (!clientName) {
      return res.status(400).json({ error: 'Client Name is required' });
    }

    const query = `
      UPDATE client_visits 
      SET clientName = ?, leadType = ?, status = ?, visitDate = ?, 
          purposeOfVisit = ?, workFeasibility = ?, clientRemarks = ?, 
          clientPreferredTime = ?, nextMeetingDate = ?
      WHERE id = ?
    `;

    const values = [
      clientName, leadType, status, visitDate || null, purposeOfVisit,
      workFeasibility, clientRemarks, clientPreferredTime, nextMeetingDate || null, id
    ];

    const [result] = await db.execute(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Visit record not found' });
    }
    res.status(200).json({ message: 'Client visit updated successfully' });
  } catch (error) {
    console.error('Error updating visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; // <-- Fixed syntax

const clientdelete = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'DELETE FROM client_visits WHERE id = ?';
    
    const [result] = await db.execute(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Visit record not found' });
    }
    res.status(200).json({ message: 'Client visit deleted successfully' });
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; // <-- Fixed syntax


module.exports = {
  createaavisit,
  getallvisit,
  getvisitbyid,
  clientvisitedit,
  clientdelete,
};






