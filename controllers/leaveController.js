const db = require('../config/db'); // Adjust path to your DB connection

const submitLeaveRequest = async (req, res) => {
  // 1. Get the authenticated user's ID
  const userId = req.user?.id; 

  // 2. We no longer expect employee_id from req.body
  const { start_date, end_date, reason, leave_type_id } = req.body;
  console.log(req.body);

  // Basic validation (Ensure userId also exists)
  if (!userId || !start_date || !end_date || !reason || !leave_type_id) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Ensure start date is before or equal to end date
  if (new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({ message: 'End date cannot be before start date.' });
  }

  try {
    // 3. Query the employee table to get the employee_id
    // *IMPORTANT: Adjust 'id' to whatever your primary key column is named in the employee table
    const employeeQuery = `SELECT id AS employee_id FROM employees WHERE user_id = ?`;
    const [employeeRows] = await db.query(employeeQuery, [userId]);

    // 4. Check if an employee record actually exists for this user
    if (employeeRows.length === 0) {
      return res.status(404).json({ message: 'Employee profile not found for this user.' });
    }

    // Extract the exact employee_id
    const employee_id = employeeRows[0].employee_id;

    // 5. Proceed with your original insert, now using the secure employee_id
    const insertQuery = `
      INSERT INTO leave_requests (employee_id, start_date, end_date, reason, status, leave_type_id) 
      VALUES (?, ?, ?, ?, 'pending', ?)
    `;
    
    const [result] = await db.query(insertQuery, [employee_id, start_date, end_date, reason, leave_type_id]);

    res.status(201).json({ 
      message: 'Leave request submitted successfully',
      requestId: result.insertId 
    });

  } catch (error) {
    console.error('Error submitting leave request:', error);
    res.status(500).json({ message: 'Server error while submitting request.' });
  }
};


const getAllLeaveTypes = async (req, res) => {
  try {
    // Write the SQL query to select all lead types, ordered by ID
    const query = `SELECT id, name FROM leave_types ORDER BY id ASC`;

    // Execute the query
    const [leaveTypes] = await db.execute(query);

    // Send the response back to the frontend
    res.status(200).json({
      message: 'Leave types fetched successfully',
      data: leaveTypes
    });
    
  } catch (error) {
    console.error('Error fetching Leave types:', error);
    res.status(500).json({ error: 'Failed to fetch Leave types' });
  }
};



const getLeaveHistory = async (req, res) => {
  const { employeeId } = req.params;

  if (!employeeId) {
    return res.status(400).json({ message: 'Employee ID is required.' });
  }

  try {
    // Optional: You can JOIN with leave_types if you want to display the type name later
    const query = `
      SELECT id, start_date, end_date, reason, status, leave_type_id 
      FROM leave_requests 
      WHERE employee_id = ? 
      ORDER BY start_date DESC
    `;
    
    // Using db.query (or db.execute depending on your mysql2 setup)
    const [history] = await db.query(query, [employeeId]);

    // Your React code expects the array directly on response.data
    // e.g., setLeaveHistory(response.data);
    res.status(200).json(history);
    
  } catch (error) {
    console.error('Error fetching leave history:', error);
    res.status(500).json({ message: 'Server error while fetching leave history.' });
  }
};

const getAllLeaveRequests = async (req, res) => {
  try {
    const query = `
      SELECT 
        lr.id, 
        e.name AS employee_name, 
        e.department_id, 
        lt.status_name AS leave_type, 
        lr.start_date, 
        lr.end_date, 
        lr.reason, 
        lr.status 
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN statuses lt ON lr.leave_type_id = lt.id AND lt.related_field = 'leave_types'
      ORDER BY lr.start_date DESC
    `;

    const [requests] = await db.query(query);

    res.status(200).json({
      message: 'Leave requests fetched successfully',
      data: requests
    });
  } catch (error) {
    console.error('Error fetching all leave requests:', error);
    res.status(500).json({ message: 'Server error while fetching requests.' });
  }
};

// Update the status of a specific leave request (Approve/Reject)
const updateLeaveStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  // Basic validation
  if (!requestId || !status) {
    return res.status(400).json({ message: 'Request ID and new status are required.' });
  }

  // Ensure status is valid
  const validStatuses = ['approved', 'rejected', 'pending'];
  if (!validStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ message: 'Invalid status provided.' });
  }

  try {
    const query = `
      UPDATE leave_requests 
      SET status = ? 
      WHERE id = ?
    `;

    const [result] = await db.query(query, [status.toLowerCase(), requestId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    res.status(200).json({ 
      message: `Leave request has been successfully ${status}.` 
    });
  } catch (error) {
    console.error(`Error updating leave status for ID ${requestId}:`, error);
    res.status(500).json({ message: 'Server error while updating status.' });
  }
};

module.exports = { 
  submitLeaveRequest, 
  getAllLeaveTypes, 
  getLeaveHistory,
  getAllLeaveRequests, // Export the new functions
  updateLeaveStatus
};