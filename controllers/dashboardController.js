const db = require('../config/db');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    // Total employees
    const [[{ total_employees }]] = await db.query(
      'SELECT COUNT(*) as total_employees FROM employees'
    );

    // Active employees
    const [[{ active_employees }]] = await db.query(
      "SELECT COUNT(*) as active_employees FROM employees WHERE employment_status = 'Active'"
    );

    // On Leave
    const [[{ on_leave }]] = await db.query(
      "SELECT COUNT(*) as on_leave FROM employees WHERE employment_status = 'On Leave'"
    );

    // Total departments
    const [[{ total_departments }]] = await db.query(
      'SELECT COUNT(*) as total_departments FROM departments'
    );

    // Total designations
    const [[{ total_designations }]] = await db.query(
      'SELECT COUNT(*) as total_designations FROM designations'
    );

    // New employees this month
    const [[{ new_this_month }]] = await db.query(
      `SELECT COUNT(*) as new_this_month FROM employees
       WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`
    );

    // Employees per department
    const [byDepartment] = await db.query(
      `SELECT d.department_name, COUNT(e.id) as count
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.id
       GROUP BY d.id, d.department_name
       ORDER BY count DESC`
    );

    // Recent employees (last 5)
    const [recentEmployees] = await db.query(
      `SELECT e.id, e.name, e.email, e.designation, e.avatar, d.department_name, e.created_at
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       ORDER BY e.created_at DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        stats: {
          total_employees,
          active_employees,
          on_leave,
          total_departments,
          total_designations,
          new_this_month,
        },
        byDepartment,
        recentEmployees,
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboardStats };
