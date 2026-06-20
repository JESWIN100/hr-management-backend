
const db = require('../config/db');

const getAllRoles = async (req, res) => {
  try {
    // Write the SQL query to select all lead types, ordered by ID
    const query = `SELECT id, name FROM roles ORDER BY id ASC`;

    // Execute the query
    const [roles] = await db.execute(query);

    // Send the response back to the frontend
    res.status(200).json({
      message: 'Roles types fetched successfully',
      data: roles
    });
    
  } catch (error) {
    console.error('Error fetching Roles types:', error);
    res.status(500).json({ error: 'Failed to fetch Roles types' });
  }
};

module.exports = {
  getAllRoles,

};
