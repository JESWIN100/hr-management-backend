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

const savePrivileges = async (req, res) => {

  const { userId, privileges } = req.body;

  if (!userId || !Array.isArray(privileges)) {
    return res.status(400).json({ error: 'User ID and privileges array are required.' });
  }


  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();


    await connection.execute('DELETE FROM user_privileges WHERE user_id = ?', [userId]);


    const insertQuery = `
      INSERT INTO user_privileges 
      (user_id, menu_id, can_view, can_create, can_edit, can_delete) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;


    for (const priv of privileges) {
  
      if (priv.read || priv.create || priv.update || priv.delete || priv.main) {
        await connection.execute(insertQuery, [
          userId,
          priv.id, 
          priv.read ? 1 : 0,  
          priv.create ? 1 : 0, 
          priv.update ? 1 : 0, 
          priv.delete ? 1 : 0  
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



// GET: Fetch all users and their summarized privileges
const getUsersPrivilage = async (req, res) => {
  try {
    // We join users with privileges and menus, extracting specific access levels
    const query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        e.avatar,
        m.caption as module_name,
        up.can_view,
        up.can_create,
        up.can_edit,
        up.can_delete
      FROM users u
      LEFT JOIN employees e ON u.id = e.user_id
      LEFT JOIN user_privileges up ON u.id = up.user_id 
      LEFT JOIN menus m ON up.menu_id = m.id
      ORDER BY u.name ASC
    `;
    
    const [rows] = await db.query(query);
    
    // Group the raw flat data into structured user objects
    const usersMap = {};
    
    rows.forEach(row => {
      if (!usersMap[row.id]) {
        usersMap[row.id] = {
          id: row.id,
          name: row.name,
          email: row.email,
          avatar: row.avatar,
          assigned_modules: [],
          privilege_count: 0
        };
      }
      
      // If the user has a linked menu/module, push it to their array
      if (row.module_name && (row.can_view || row.can_create || row.can_edit || row.can_delete)) {
        usersMap[row.id].assigned_modules.push({
          moduleName: row.module_name,
          read: !!row.can_view,
          write: !!row.can_create,
          edit: !!row.can_edit,
          delete: !!row.can_delete
        });
        usersMap[row.id].privilege_count++;
      }
    });
    
    // Convert map to array and sort by privilege_count DESC
    const formattedData = Object.values(usersMap).sort((a, b) => b.privilege_count - a.privilege_count);
    
    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
}


const getUserPrivileges = async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.execute('SELECT * FROM user_privileges WHERE user_id = ?', [userId]);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error while fetching user privileges.' });
  }
}

module.exports = {
  getallmenu,
  savePrivileges,
  getUsersPrivilage,
  getUserPrivileges
};