const db = require('../config/db');

const safe = async (fn, fallback) => {
  try {
    return await fn();
  } catch (err) {
    console.error('[admin-dashboard] partial section failed:', err.message);
    return fallback;
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    // Ensure user has admin privileges here (e.g., checking role)
    // if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });

    const [
      adminProfile,
      overviewStats,
      pendingLeaves,
      projects,
      attendanceStats
    ] = await Promise.all([
      safe(() => getAdminProfile(userId), {}),
      safe(() => getOverviewStats(), { totalEmployees: 0, presentToday: 0, onLeaveToday: 0, activeProjects: 0, lateToday: 0 }),
      safe(() => getPendingLeaves(), []),
      safe(() => getActiveProjects(), []),
      safe(() => getCompanyAttendanceStats(), [])
    ]);

    res.json({
      success: true,
      data: {
        adminProfile,
        overview: overviewStats,
        pendingLeaves,
        projects,
        attendanceStats
      },
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error building admin dashboard' });
  }
};

// ── Sections ─────────────────────────────────────────────────────────────

async function getAdminProfile(userId) {
  const [rows] = await db.query('SELECT name, email, avatar FROM employees WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function getOverviewStats() {
  const [[empCount]] = await db.query(`SELECT COUNT(*) as total FROM employees WHERE employment_status = 'Active'`);
  const [[projCount]] = await db.query(`SELECT COUNT(*) as total FROM projects WHERE status NOT IN ('completed', 'Completed')`);
  
  const [[attendanceToday]] = await db.query(`
    SELECT 
      SUM(CASE WHEN status IN ('present', 'Present') THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status IN ('late', 'Late') THEN 1 ELSE 0 END) as late
    FROM attendance WHERE record_date = CURDATE()
  `);

  const [[leavesToday]] = await db.query(`
    SELECT COUNT(DISTINCT employee_id) as onLeave
    FROM leave_requests 
    WHERE status = 'approved' AND CURDATE() BETWEEN start_date AND end_date
  `);

  return {
    totalEmployees: empCount.total || 0,
    activeProjects: projCount.total || 0,
    presentToday: (attendanceToday?.present || 0) + (attendanceToday?.late || 0),
    lateToday: attendanceToday?.late || 0,
    onLeaveToday: leavesToday?.onLeave || 0
  };
}

async function getPendingLeaves() {
  const [rows] = await db.query(`
    SELECT lr.id, lr.start_date, lr.end_date, s.status_name as leave_type, e.name as employee_name, e.avatar as employee_avatar
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    LEFT JOIN statuses s ON lr.leave_type_id = s.id
    WHERE lr.status = 'pending'
    ORDER BY lr.created_at ASC
    LIMIT 6
  `);
  return rows;
}

async function getActiveProjects() {
  const [rows] = await db.query(`
    SELECT id, name, status, start_date, end_date 
    FROM projects 
    WHERE status NOT IN ('completed', 'Completed') OR status IS NULL
    ORDER BY end_date ASC 
    LIMIT 5
  `);
  
  // Calculate aggregate progress for company projects
  const projects = [];
  for (const p of rows) {
    const [[taskStats]] = await db.query(`
      SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
      FROM tasks WHERE project_id = ?
    `, [p.id]);

    const total = taskStats?.total || 0;
    const completed = taskStats?.completed || 0;
    projects.push({
      ...p,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }
  return projects;
}

async function getCompanyAttendanceStats() {
  // Returns attendance data for the last 7 days for a bar/line chart
  const [rows] = await db.query(`
    SELECT record_date, 
           SUM(CASE WHEN status IN ('present', 'late', 'Present', 'Late') THEN 1 ELSE 0 END) as present_count
    FROM attendance 
    WHERE record_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY record_date
    ORDER BY record_date ASC
  `);
  return rows;
}

module.exports = { getAdminDashboard };