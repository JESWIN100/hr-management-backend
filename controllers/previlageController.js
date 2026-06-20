const db = require('../config/db');

// Your existing getallmenu function
const getallmenu = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM menus');
    res.status(200).json({ message: 'Menus retrieved successfully!', data: rows });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error while fetching menus.' });
  }
}

// NEW: Function to save privileges to the user_privileges table
const savePrivileges = async (req, res) => {
  // We expect a userId and an array of privileges from the React frontend
  const { userId, privileges } = req.body;

  if (!userId || !Array.isArray(privileges)) {
    return res.status(400).json({ error: 'User ID and privileges array are required.' });
  }

  // Get a dedicated connection from the pool so we can use a transaction
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Clear existing privileges for this user to avoid duplicates
    await connection.execute('DELETE FROM user_privileges WHERE user_id = ?', [userId]);

    // 2. Prepare the insert query
    const insertQuery = `
      INSERT INTO user_privileges 
      (user_id, menu_id, can_view, can_create, can_edit, can_delete) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    // 3. Loop through the array and insert the newly checked privileges
    for (const priv of privileges) {
      // We only insert if at least one permission is granted, or if they have "main" access
      if (priv.read || priv.create || priv.update || priv.delete || priv.main) {
        await connection.execute(insertQuery, [
          userId,
          priv.id, // This needs to be the actual menu_id from the database
          priv.read ? 1 : 0,   // Maps to can_view
          priv.create ? 1 : 0, // Maps to can_create
          priv.update ? 1 : 0, // Maps to can_edit
          priv.delete ? 1 : 0  // Maps to can_delete
        ]);
      }
    }

    // Commit the transaction
    await connection.commit();
    res.status(200).json({ message: 'User privileges saved successfully!' });

  } catch (error) {
    // If anything fails, rollback the whole process
    await connection.rollback();
    console.error('Error saving privileges:', error);
    res.status(500).json({ error: 'Failed to save user privileges.' });
  } finally {
    // Always release the connection back to the pool
    connection.release();
  }
}

module.exports = {
  getallmenu,
  savePrivileges
};