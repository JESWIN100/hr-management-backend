const db = require('../config/db');

const chatget= async (req, res) => {
  try {
    const { projectId } = req.params;
    const query = `
      SELECT 
        c.id, 
        c.message, 
        c.created_at, 
        e.name as sender_name, 
        e.avatar,
        c.sender_id
      FROM chat_messages c
      JOIN employees e ON c.sender_id = e.id
      WHERE c.project_id = ?
      ORDER BY c.created_at ASC
    `;
    const [messages] = await db.query(query, [projectId]);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error });
  }
}

// Post a new message
const createChat= async (req, res) => {
  try {
    const { project_id,sender_id,  message } = req.body;
  
    const [result] = await db.query(
      'INSERT INTO chat_messages (project_id, sender_id, message) VALUES (?, ?, ?)',
      [project_id, sender_id, message]
    );

    // Fetch the inserted message with sender details to return to the frontend
    const [newMessage] = await db.query(`
      SELECT c.id, c.message, c.created_at, e.name as sender_name, e.avatar, c.sender_id
      FROM chat_messages c
      JOIN employees e ON c.sender_id = e.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.json(newMessage[0]);
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ message: 'Failed to send message', error });
  }
}


const chatgetforuser = async (req, res) => {
  try {
    const { userId, receiverId } = req.params;
    console.log(userId, receiverId);

    // 1. Fetch the receiver's online status
    // Assuming you have an 'isonline' column in a 'users' table
    const [emp] = await db.query(
      `SELECT e.user_id, u.isonline 
       FROM employees e
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.id = ?`,
      [receiverId]
    );

    console.log("logged user_id:", emp[0]?.user_id);
    
    // Convert to boolean (true if 1/'true', false otherwise)
    const isOnline = Boolean(emp[0]?.isonline); 

    const query = `
      SELECT 
        c.id, 
        c.message, 
        c.created_at, 
        c.is_seen,
        e.name as sender_name, 
        e.avatar,
        c.sender_id
      FROM task_chat_messages c
      JOIN employees e ON c.sender_id = e.id
      WHERE (c.sender_id = ? AND c.receiver_id = ?) 
         OR (c.sender_id = ? AND c.receiver_id = ?)
      ORDER BY c.created_at ASC
    `;
    
    const [messages] = await db.query(query, [userId, receiverId, receiverId, userId]);
    
    // 2. Return BOTH messages and the online status as an object
    res.json({ messages, isOnline });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Failed to fetch messages', error });
  }
}
// Post a new message
const createChatforuser = async (req, res) => {
  try {
    const { sender_id, receiver_id, message } = req.body;
  console.log(req.body);
  
    const [result] = await db.query(
      'INSERT INTO task_chat_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
      [sender_id, receiver_id, message]
    );

    // Fetch the inserted message with sender details to return to the frontend immediately
    const [newMessage] = await db.query(`
      SELECT c.id, c.message, c.created_at, e.name as sender_name, e.avatar, c.sender_id
      FROM task_chat_messages c
      JOIN employees e ON c.sender_id = e.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.json(newMessage[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Failed to send message', error });
  }
}



module.exports={
    chatget,createChat,chatgetforuser,createChatforuser
}