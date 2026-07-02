const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'hr_core_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // 2. Fetch User
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];

    // 3. Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

await db.query(
  'UPDATE users SET isonline = 1 WHERE id = ?',
  [user.id]
);

    // 4. Fetch Employee Details
    // FIX: Added 'role' to the SELECT statement
  const employeeQuery = `
      SELECT e.id, e.name, e.avatar, r.name AS role_name 
      FROM employees e
      LEFT JOIN roles r ON e.role = r.id
      WHERE e.user_id = ?
    `;
    const [employees] = await db.query(employeeQuery, [user.id]);
  
    // Set default avatar and role from the users table
    let employeeAvatar = user.avatar || null; 
    let employeeRole = user.role || null; 
    let employeeId = null;
    let sessionId = null;
    // 5. Update Employee Data and Attendance (If applicable)
    if (employees.length > 0) {
      const employee = employees[0];
        employeeId = employee.id; 
      // Assign the fetched employee details
      employeeAvatar = employee.avatar || employeeAvatar;
      employeeRole = employee.role_name || employeeRole;

      // Log attendance
      const attendanceQuery = `
        INSERT INTO attendance (employee_id, record_date, status) 
        VALUES (?, CURDATE(), 'present')
        ON DUPLICATE KEY UPDATE status = 'present'
      `;
      await db.query(attendanceQuery, [employee.id]); 


      const [attendanceRows] = await db.query(
        'SELECT id FROM attendance WHERE employee_id = ? AND record_date = CURDATE()',
        [employeeId]
      );
      const attendanceId = attendanceRows[0].id;
   
const [sessionResult] = await db.query(
            'INSERT INTO employee_sessions (user_id,attendance_id, login_time) VALUES (?,?, NOW())',
            [user?.id,attendanceId] // assuming you have the user object here
        );
         sessionId = sessionResult.insertId;
         }
   
    const token = jwt.sign(
      { id: user.id, email: user.email, role: employeeRole },
      JWT_SECRET, // Ensure this is imported or accessed via process.env.JWT_SECRET
      { expiresIn: JWT_EXPIRES_IN } 
    );
       
console.log(employeeRole,employeeAvatar);

    // 7. Send Response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        employeeId,
        name: user.name, // Ensure 'name' exists in your users table schema
        email: user.email,
        role: employeeRole,
        image: employeeAvatar
      },
      sessionId:sessionId
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    // Extract employee_id along with the other details
    const { employee_id, name, email, password,  } = req.body;
    console.log(req.body);

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if the user email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Insert the new user into the users table
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword ]
    );

    const newUserId = result.insertId; 
    if (employee_id) {
      await db.query(
        'UPDATE employees SET user_id = ? WHERE id = ?',
        [newUserId, employee_id]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: newUserId, email},
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Account created and linked to employee successfully',
      token,
      user: {
        id: newUserId,
        name,
        email      
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const logout = async (req, res) => {
    const { sessionId,userId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
    }

    try {
        // Update the logout time for this specific session
        await db.query(
            'UPDATE employee_sessions SET logout_time = NOW() WHERE id = ?',
            [sessionId]
        );

         await db.query(
            'UPDATE users SET isonline = 0 WHERE id = ?',
            [userId]
        );
        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error logging out" });
    }
};

module.exports = { login, signup, getMe,logout };
