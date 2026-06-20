const db = require('../config/db');

const getAllStatus = async (req, res) => {
  try {
    // Write the SQL query to select all lead types, ordered by ID
   const query = `
      SELECT id, status_name, description 
      FROM statuses 
      WHERE related_field = 'opportunity_status' AND is_active = 1
      ORDER BY id ASC
    `;

    // Execute the query
    const [status] = await db.execute(query);

    // Send the response back to the frontend
    res.status(200).json({
      message: 'status types fetched successfully',
      data: status
    });
    
  } catch (error) {
    console.error('Error fetching status types:', error);
    res.status(500).json({ error: 'Failed to fetch status types' });
  }
};

const getworkfeasbility = async (req, res) => {
  try {
    // Write the SQL query to select all lead types, ordered by ID
   const query = `
      SELECT id, status_name, description 
      FROM statuses 
      WHERE related_field = 'work_feasbility' AND is_active = 1
      ORDER BY id ASC
    `;

    // Execute the query
    const [status] = await db.execute(query);

    // Send the response back to the frontend
    res.status(200).json({
      message: 'status types fetched successfully',
      data: status
    });
    
  } catch (error) {
    console.error('Error fetching status types:', error);
    res.status(500).json({ error: 'Failed to fetch status types' });
  }
};
const getEmploymentStatus = async (req, res) => {
  try {
    // Write the SQL query to select all lead types, ordered by ID
   const query = `
      SELECT id, status_name, description 
      FROM statuses 
      WHERE related_field = 'employment_status' AND is_active = 1
      ORDER BY id ASC
    `;

    // Execute the query
    const [status] = await db.execute(query);

    // Send the response back to the frontend
    res.status(200).json({
      message: 'status types fetched successfully',
      data: status
    });
    
  } catch (error) {
    console.error('Error fetching status types:', error);
    res.status(500).json({ error: 'Failed to fetch status types' });
  }
};
const getLeaveStatus = async (req, res) => {
  try {
    // Write the SQL query to select all lead types, ordered by ID
   const query = `
      SELECT id, status_name, description 
      FROM statuses 
      WHERE related_field = 'leave_types' AND is_active = 1
      ORDER BY id ASC
    `;

    // Execute the query
    const [leavestatus] = await db.execute(query);

    // Send the response back to the frontend
    res.status(200).json({
      message: 'leavestatus fetched successfully',
      data: leavestatus
    });
    
  } catch (error) {
    console.error('Error fetching leavestatus:', error);
    res.status(500).json({ error: 'Failed to fetch leavestatus' });
  }
};


module.exports = {
  // ... your other controllers like createaavisit
  getAllStatus,
  getworkfeasbility,getEmploymentStatus,getLeaveStatus
};