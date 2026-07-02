const db = require('../config/db');

// Default leave quota per type (days/year) used as a fallback since the
// leave_types table currently has no `quota` column. Adjust freely, or add a
// `quota` column to leave_types and this will pick it up automatically.
const DEFAULT_LEAVE_QUOTA = 24;

// Expected working hours/day used when an employee has no `working_hours` set
const DEFAULT_WORKING_HOURS = 8;

const safe = async (fn, fallback) => {
  try {
    return await fn();
  } catch (err) {
    console.error('[dashboard] partial section failed:', err.message);
    return fallback;
  }
};

const resolveEmployeeId = async (userId) => {
  const [rows] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
  return rows.length ? rows[0].id : null;
};

// GET /api/dashboard/me
const getMyDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const employeeId = await resolveEmployeeId(userId);
    if (!employeeId) {
      return res.status(404).json({ success: false, message: 'Employee profile not found for this user' });
    }

    const [
      profile,
      attendanceToday,
      attendanceMonth,
      weeklyHours,
      leave,
      workSummary,
      tasks,
      projects,
      team,
      performance,
      // skills,
      anniversaries,
      notifications,
    ] = await Promise.all([
      safe(() => getProfile(employeeId), null),
      safe(() => getTodayAttendance(employeeId), null),
      safe(() => getMonthAttendance(employeeId), { present: 0, late: 0, absent: 0, leave: 0, totalWorkingDays: 0 }),
      safe(() => getWeeklyHours(employeeId), []),
      safe(() => getLeaveSummary(employeeId), { types: [], totalAvailable: 0, totalUsed: 0, totalDays: 0 }),
      safe(() => getWorkSummary(employeeId), null),
      safe(() => getTasks(employeeId), { counts: { pending: 0, inProgress: 0, completed: 0, overdue: 0 }, list: [] }),
      safe(() => getProjects(employeeId), []),
      safe(() => getTeam(employeeId), []),
      safe(() => getPerformance(employeeId), []),
      // safe(() => getSkills(employeeId), []),
      safe(() => getAnniversaries(employeeId), []),
      safe(() => getNotifications(employeeId), []),
    ]);

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    res.json({
      success: true,
      data: {
        profile,
        attendance: {
          today: attendanceToday,
          thisMonth: attendanceMonth,
          weekly: weeklyHours,
        },
        leave,
        workSummary,
        tasks,
        projects,
        team,
        performance,
        // skills,
        anniversaries,
        notifications,
      },
    });
  } catch (err) {
    console.error('Employee dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error building dashboard' });
  }
};

// ── Sections ─────────────────────────────────────────────────────────────

async function getProfile(employeeId) {
  const [rows] = await db.query(
    `SELECT e.id, e.name, e.email, e.phone, e.avatar, e.designation,
            e.joining_date, e.employment_status, e.address, e.working_hours,
            d.department_name, r.name AS role_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN roles r ON e.role = r.id
     WHERE e.id = ?`,
    [employeeId]
  );
  return rows[0] || null;
}

async function getTodayAttendance(employeeId) {
  const [[att]] = await db.query(
    `SELECT status FROM attendance WHERE employee_id = ? AND record_date = CURDATE()`,
    [employeeId]
  );

  const [[session]] = await db.query(
    `SELECT es.login_time, es.logout_time
     FROM employee_sessions es
     JOIN employees e ON e.user_id = es.user_id
     WHERE e.id = ? AND DATE(es.login_time) = CURDATE()
     ORDER BY es.login_time DESC LIMIT 1`,
    [employeeId]
  );

  const [[worked]] = await db.query(
    `SELECT SUM(TIMESTAMPDIFF(SECOND, es.login_time, IFNULL(es.logout_time, NOW()))) / 3600 AS hours
     FROM employee_sessions es
     JOIN employees e ON e.user_id = es.user_id
     WHERE e.id = ? AND DATE(es.login_time) = CURDATE()`,
    [employeeId]
  );

 const rawHours = worked?.hours ? Number(worked.hours) : 0;

  return {
    status: att?.status || 'empty',
    checkInTime: session?.login_time || null,
    checkOutTime: session?.logout_time || null,
    isCheckedIn: !!(session?.login_time && !session?.logout_time),
    workedHoursToday: Number(rawHours.toFixed(2)),
  };
}

async function getMonthAttendance(employeeId) {
  const [rows] = await db.query(
    `SELECT status, COUNT(*) as count FROM attendance
     WHERE employee_id = ? AND MONTH(record_date) = MONTH(CURDATE()) AND YEAR(record_date) = YEAR(CURDATE())
     GROUP BY status`,
    [employeeId]
  );

  const summary = { present: 0, late: 0, absent: 0, leave: 0, totalWorkingDays: 0 };
  rows.forEach((r) => {
    const key = String(r.status).toLowerCase();
    if (summary[key] !== undefined) summary[key] = r.count;
    summary.totalWorkingDays += r.count;
  });
  return summary;
}

async function getWeeklyHours(employeeId) {
  const [rows] = await db.query(
    `SELECT DAYOFWEEK(es.login_time) as dow,
            SUM(TIMESTAMPDIFF(SECOND, es.login_time, IFNULL(es.logout_time, NOW()))) / 3600 AS hours
     FROM employee_sessions es
     JOIN employees e ON e.user_id = es.user_id
     WHERE e.id = ? AND YEARWEEK(es.login_time, 1) = YEARWEEK(CURDATE(), 1)
     GROUP BY dow`,
    [employeeId]
  );

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return dayNames.map((name, idx) => {
    const found = rows.find((r) => r.dow === idx + 1);
    return { day: name, hours: found ? Number(found.hours.toFixed(1)) : 0 };
  });
}

// async function getLeaveSummary(employeeId) {
//   const [types] = await db.query(`SELECT id, name FROM leave_types ORDER BY id ASC`);

//   const [used] = await db.query(
//     `SELECT leave_type_id, SUM(DATEDIFF(end_date, start_date) + 1) AS days
//      FROM leave_requests
//      WHERE employee_id = ? AND status = 'approved' AND YEAR(start_date) = YEAR(CURDATE())
//      GROUP BY leave_type_id`,
//     [employeeId]
//   );

//   const colors = ['#22c55e', '#f97316', '#a855f7', '#0ea5e9', '#eab308', '#ef4444'];

//   const mapped = types.map((t, idx) => {
//     const usedDays = used.find((u) => u.leave_type_id === t.id)?.days || 0;
//     const quota = DEFAULT_LEAVE_QUOTA / types.length || DEFAULT_LEAVE_QUOTA;
//     return {
//       id: t.id,
//       name: t.name,
//       used: Number(usedDays),
//       total: Math.round(quota),
//       color: colors[idx % colors.length],
//     };
//   });

//   const totalUsed = mapped.reduce((s, t) => s + t.used, 0);
//   const totalDays = mapped.reduce((s, t) => s + t.total, 0);

//   return {
//     types: mapped,
//     totalUsed,
//     totalAvailable: Math.max(totalDays - totalUsed, 0),
//     totalDays,
//   };
// }
async function getLeaveSummary(employeeId) {
  // 1. Fetch leave types directly from your master statuses table
  // Filtering where related_field is 'leave_types' and ensuring it's active
  const [types] = await db.query(
    `SELECT id, status_name AS name 
     FROM statuses 
     WHERE related_field = 'leave_types' AND is_active = 1 
     ORDER BY id ASC`
  );

  // 2. Fetch used leave days 
  // (leave_type_id in leave_requests will match the id from the statuses table)
  const [used] = await db.query(
    `SELECT leave_type_id, SUM(DATEDIFF(end_date, start_date) + 1) AS days
     FROM leave_requests
     WHERE employee_id = ? AND status = 'approved' AND YEAR(start_date) = YEAR(CURDATE())
     GROUP BY leave_type_id`,
    [employeeId]
  );

  const colors = ['#22c55e', '#f97316', '#a855f7', '#0ea5e9', '#eab308', '#ef4444'];

  // 3. Map the usage data to the leave types fetched from the statuses table
  const mapped = types.map((t, idx) => {
    const usedDays = used.find((u) => u.leave_type_id === t.id)?.days || 0;
    const quota = DEFAULT_LEAVE_QUOTA / types.length || DEFAULT_LEAVE_QUOTA;
    
    return {
      id: t.id,
      name: t.name, // This now contains the 'status_name' from your DB
      used: Number(usedDays),
      total: Math.round(quota),
      color: colors[idx % colors.length],
    };
  });

  const totalUsed = mapped.reduce((s, t) => s + t.used, 0);
  const totalDays = mapped.reduce((s, t) => s + t.total, 0);

  return {
    types: mapped,
    totalUsed,
    totalAvailable: Math.max(totalDays - totalUsed, 0),
    totalDays,
  };
}

async function getWorkSummary(employeeId) {
  const [[row]] = await db.query(
    `SELECT
        AVG(TIME_TO_SEC(TIME(es.login_time))) AS avg_checkin_sec,
        AVG(TIMESTAMPDIFF(SECOND, es.login_time, es.logout_time)) / 3600 AS avg_hours,
        SUM(GREATEST(TIMESTAMPDIFF(SECOND, es.login_time, es.logout_time) / 3600 - 8, 0)) AS overtime_hours,
        SUM(CASE WHEN TIME(es.login_time) > '09:30:00' THEN 1 ELSE 0 END) AS late_count
     FROM employee_sessions es
     JOIN employees e ON e.user_id = es.user_id
     WHERE e.id = ? AND MONTH(es.login_time) = MONTH(CURDATE()) AND YEAR(es.login_time) = YEAR(CURDATE())
       AND es.logout_time IS NOT NULL`,
    [employeeId]
  );

  // 1. If there are no completed sessions this month, MySQL returns NULL for all sums/averages.
  // We should catch this early and return default empty values.
  if (!row || row.avg_checkin_sec === null) {
    return {
      avgCheckIn: null,
      avgWorkHours: 0,
      overtimeHours: 0,
      lateCheckIns: 0,
    };
  }

  // 2. Safely parse the time calculation
  const avgCheckInSec = Math.round(Number(row.avg_checkin_sec));
  const avgCheckIn = `${String(Math.floor(avgCheckInSec / 3600)).padStart(2, '0')}:${String(Math.floor((avgCheckInSec % 3600) / 60)).padStart(2, '0')}`;

  // 3. Convert SQL Strings to JS Numbers BEFORE using .toFixed()
  const rawAvgHours = Number(row.avg_hours) || 0;
  const rawOvertime = Number(row.overtime_hours) || 0;
  const lateCheckIns = Number(row.late_count) || 0;

  return {
    avgCheckIn,
    avgWorkHours: Number(rawAvgHours.toFixed(2)),
    overtimeHours: Number(rawOvertime.toFixed(2)),
    lateCheckIns: lateCheckIns,
  };
}

async function getTasks(employeeId) {
  const [rows] = await db.query(
    `SELECT t.id, t.title, t.status, t.start_date, t.end_date, p.name AS project_name
     FROM tasks t
     JOIN task_employees te ON t.id = te.task_id
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE te.employee_id = ?
     ORDER BY t.end_date ASC`,
    [employeeId]
  );

  const counts = { pending: 0, inProgress: 0, completed: 0, overdue: 0 };
  const today = new Date();
  rows.forEach((t) => {
    const status = String(t.status || '').toLowerCase();
    if (status === 'completed') counts.completed += 1;
    else if (status === 'in progress') counts.inProgress += 1;
    else counts.pending += 1;

    if (status !== 'completed' && t.end_date && new Date(t.end_date) < today) {
      counts.overdue += 1;
    }
  });

  const list = rows
    .filter((t) => String(t.status).toLowerCase() !== 'completed')
    .slice(0, 6);

  return { counts, list };
}

async function getProjects(employeeId) {
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.status, p.start_date, p.end_date
     FROM projects p
     JOIN project_employees pe ON pe.project_id = p.id
     WHERE pe.employee_id = ? AND (p.status IS NULL OR p.status NOT IN ('completed', 'Completed'))
     ORDER BY p.end_date ASC
     LIMIT 6`,
    [employeeId]
  );

  const projects = [];
  for (const p of rows) {
    const [members] = await db.query(
      `SELECT e.id, e.name, e.avatar
       FROM project_employees pe
       JOIN employees e ON e.id = pe.employee_id
       WHERE pe.project_id = ?
       LIMIT 4`,
      [p.id]
    );

    const [[taskStats]] = await db.query(
      `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
       FROM tasks WHERE project_id = ?`,
      [p.id]
    );

    const total = taskStats?.total || 0;
    const completed = taskStats?.completed || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    projects.push({
      id: p.id,
      name: p.name,
      status: p.status,
      startDate: p.start_date,
      endDate: p.end_date,
      members,
      progress,
    });
  }

  return projects;
}

async function getTeam(employeeId) {
  const [rows] = await db.query(
    `SELECT DISTINCT e.id, e.name, e.designation, e.avatar, u.isonline
     FROM employees e
     LEFT JOIN users u ON u.id = e.user_id
     JOIN project_employees pe ON e.id = pe.employee_id
     WHERE pe.project_id IN (
         SELECT project_id 
         FROM project_employees 
         WHERE employee_id = ?
     )
       AND e.id != ?
     LIMIT 6`,
    [employeeId, employeeId]
  );
  
  return rows.map((r) => ({ ...r, isonline: !!r.isonline }));
}
async function getPerformance(employeeId) {
  const [rows] = await db.query(
    `SELECT
        DATE_FORMAT(t.end_date, '%Y-%m') AS ym,
        COUNT(*) AS total,
        SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed
     FROM tasks t
     JOIN task_employees te ON te.task_id = t.id
     WHERE te.employee_id = ? AND t.end_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY ym
     ORDER BY ym ASC`,
    [employeeId]
  );

  return rows.map((r) => {
    const [year, month] = r.ym.split('-');
    const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
    const score = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
    return { month: monthName, score };
  });
}

// async function getSkills(employeeId) {
//   // Optional table — see migrations/employee_skills.sql. Returns [] if not created yet.
//   const [rows] = await db.query(
//     `SELECT skill_name AS name, proficiency AS level
//      FROM employee_skills WHERE employee_id = ? ORDER BY proficiency DESC`,
//     [employeeId]
//   );
//   return rows;
// }

async function getAnniversaries(employeeId) {
  const [rows] = await db.query(
    `SELECT id, name, avatar, joining_date,
            (YEAR(CURDATE()) - YEAR(joining_date)) AS years
     FROM employees
     WHERE MONTH(joining_date) = MONTH(CURDATE()) AND id != ?
     ORDER BY DAY(joining_date) ASC
     LIMIT 5`,
    [employeeId]
  );
  return rows;
}

async function getNotifications(employeeId) {
  const items = [];

  const [leaveRows] = await db.query(
    `SELECT id, status, start_date, end_date FROM leave_requests
     WHERE employee_id = ? ORDER BY start_date DESC LIMIT 5`,
    [employeeId]
  );
  leaveRows.forEach((l) => {
    items.push({
      id: `leave-${l.id}`,
      type: 'leave',
      message: `Leave request (${l.start_date} - ${l.end_date}) is ${l.status}`,
      time: l.start_date,
    });
  });

  const [dueTasks] = await db.query(
    `SELECT t.id, t.title, t.end_date FROM tasks t
     JOIN task_employees te ON te.task_id = t.id
     WHERE te.employee_id = ? AND t.status != 'Completed'
       AND t.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     ORDER BY t.end_date ASC LIMIT 5`,
    [employeeId]
  );
  dueTasks.forEach((t) => {
    items.push({
      id: `task-${t.id}`,
      type: 'task',
      message: `Task "${t.title}" is due on ${t.end_date}`,
      time: t.end_date,
    });
  });

  return items
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 8);
}

module.exports = { getMyDashboard };
