require('dotenv').config();
const db = require('../config/db');





const createaavisit = async (req, res) => {
  const user_id = req.user.id;
  console.log("user_id", user_id);

  try {
    // 1. Destructure the new ID variables from the frontend payload
    const {
      clientName, lead_type_id, status_id, visitDate, purposeOfVisit, 
      work_feasibility_id, clientRemarks, clientPreferredTime, nextMeetingDate
    } = req.body;

    // 2. Basic validation
    if (!clientName) {
      return res.status(400).json({ error: 'Client Name is required' });
    }
    
    // Optional but recommended: Validate that the IDs are present since they are Foreign Keys
    if (!lead_type_id || !status_id) {
      return res.status(400).json({ error: 'Lead Type and Status are required' });
    }

    // 3. Update the INSERT query columns
    const query = `
      INSERT INTO client_visits 
      (user_id, clientName, lead_type_id, status_id, visitDate, purposeOfVisit, work_feasibility_id, clientRemarks, clientPreferredTime, nextMeetingDate) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 4. Update the values array to pass the IDs
    const values = [
      user_id, clientName, lead_type_id, status_id, visitDate || null, purposeOfVisit,
      work_feasibility_id, clientRemarks, clientPreferredTime, nextMeetingDate || null
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
    const userRole = req.user.role; 

    let query;
    let values = [];

    // The base query joining the SAME 'statuses' table three times.
    // 'lt', 's', and 'wf' are aliases so SQL knows which lookup we are doing.
    const baseQuery = `
      SELECT 
        cv.*,
        u.name AS user_name, 
        lt.status_name AS lead_type_name,
        s.status_name AS status_name,
        wf.status_name AS work_feasibility_name
      FROM client_visits cv
      LEFT JOIN users u ON cv.user_id = u.id
      LEFT JOIN statuses lt ON cv.lead_type_id = lt.id
      LEFT JOIN statuses s ON cv.status_id = s.id
      LEFT JOIN statuses wf ON cv.work_feasibility_id = wf.id
    `;

    // Check if the user is an admin
    if (userRole === 'admin') {
      // Admin sees everything
      query = `${baseQuery} ORDER BY cv.created_at DESC`;
    } else {
      // Regular user sees only their own visits
      query = `${baseQuery} WHERE cv.user_id = ? ORDER BY cv.created_at DESC`;
      values = [userId];
    }

    const [rows] = await db.execute(query, values);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getVisitsByUserId = async (req, res) => {
  try {
    // Extract the id from the params (which represents the user_id)
    const { id: userId } = req.params; 
    
    // UPDATE 1: Change the WHERE clause to look for 'user_id' instead of 'id'
    const query = 'SELECT * FROM client_visits WHERE user_id = ?';
    const [rows] = await db.execute(query, [userId]);

    if (rows.length === 0) {
      // Adjusted the error message to be a bit more specific
      return res.status(404).json({ error: 'No visit records found for this user' });
    }
    
    // UPDATE 2: Return the entire 'rows' array instead of rows[0] 
    // so the client receives all visits associated with that user.
    res.status(200).json(rows);
    
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const clientvisitedit = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      clientName, leadType, status, visitDate, purposeOfVisit, 
      work_feasibility_id, clientRemarks, clientPreferredTime, nextMeetingDate
    } = req.body;

    if (!clientName) {
      return res.status(400).json({ error: 'Client Name is required' });
    }

    const query = `
      UPDATE client_visits 
      SET clientName = ?, leadType = ?, status = ?, visitDate = ?, 
          purposeOfVisit = ?, work_feasibility_id = ?, clientRemarks = ?, 
          clientPreferredTime = ?, nextMeetingDate = ?
      WHERE id = ?
    `;

    const values = [
      clientName, leadType, status, visitDate || null, purposeOfVisit,
      work_feasibility_id, clientRemarks, clientPreferredTime, nextMeetingDate || null, id
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
  getVisitsByUserId,
  clientvisitedit,
  clientdelete,
};






