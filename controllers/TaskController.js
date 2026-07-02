const db = require('../config/db');

// Add Project
const addProject = async (req, res) => {
    // 1. Extract the new date fields from the request body
    const { 
        name, 
        description, 
        status, 
        start_date, 
        end_date, 
        submit_date, 
        completed_date 
    } = req.body;

    try {
        // 2. Update the SQL query to insert all 7 fields
        const [result] = await db.query(
            `INSERT INTO projects 
            (name, description, status, start_date, end_date, submit_date, completed_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name, 
                description, 
                status || 'planning', 
                start_date || null,       // Handle empty date inputs as NULL
                end_date || null, 
                submit_date || null, 
                completed_date || null
            ]
        );

        // 3. Return the fully formed project object back to the React UI
        res.status(201).json({
            id: result.insertId,
            name,
            description,
            status: status || 'planning',
            start_date: start_date || null,
            end_date: end_date || null,
            submit_date: submit_date || null,
            completed_date: completed_date || null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All Projects
const getAllProjects = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM projects');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Tasks
const getTask = async (req, res) => {
    try {
        const query = `
            SELECT 
                t.*,
                u.name AS employee_name,
                u.avatar AS image,
                p.name AS project_name
            FROM tasks t
            LEFT JOIN employees u ON t.assigned_to = u.id
            LEFT JOIN projects p ON t.project_id = p.id
        `;

        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// Get Tasks
const getTaskbyid = async (req, res) => {
    const { project_id, working_stage_id } = req.query; 

    try {
        let query = `
            SELECT 
                t.*,
                p.name AS project_name,
                GROUP_CONCAT(u.id) AS assigned_to_ids,
                GROUP_CONCAT(u.name SEPARATOR ', ') AS employee_names,
                GROUP_CONCAT(u.avatar) AS images
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN task_employees te ON t.id = te.task_id
            LEFT JOIN employees u ON te.employee_id = u.id
            WHERE 1=1
        `;
        
        const queryParams = [];

        if (project_id) {
            query += ` AND t.project_id = ?`;
            queryParams.push(project_id);
        }

        if (working_stage_id) {
            query += ` AND t.working_stage_id = ?`;
            queryParams.push(working_stage_id);
        }

        // Essential to group by task ID so GROUP_CONCAT combines the employees
        query += ` GROUP BY t.id`;

        const [rows] = await db.query(query, queryParams);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- 2. Update addTask to handle an array of assigned_to IDs ---
const addTask = async (req, res) => {
    const { project_id, working_stage_id, assigned_to, title, description, start_date, end_date } = req.body;

    try {
        // Insert the task
        const [result] = await db.query(
            `INSERT INTO tasks (project_id, working_stage_id, title, description, start_date, end_date, status)
             VALUES (?, ?, ?, ?, ?, ?, 'New')`,
            [project_id, working_stage_id, title, description, start_date, end_date]
        );

        const newTaskId = result.insertId;

        // Insert multiple employees into the mapping table
        if (assigned_to && Array.isArray(assigned_to) && assigned_to.length > 0) {
            const values = assigned_to.map(empId => [newTaskId, empId]);
            await db.query(
                `INSERT INTO task_employees (task_id, employee_id) VALUES ?`,
                [values]
            );
        }

        res.status(201).json({
            id: newTaskId,
            title,
            status: 'New'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Update Task Status
const statusUpdate = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    let dateField = '';

    if (status === 'In Progress') {
        dateField = ', submit_date = NOW()';
    } else if (status === 'Completed') {
        dateField = ', completed_date = NOW()';
    }

    try {
        await db.query(
            `UPDATE tasks SET status = ? ${dateField} WHERE id = ?`,
            [status, id]
        );

        res.json({
            message: 'Task status updated successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateTaskAssignee = async (req, res) => {
    const { id } = req.params;          // Task ID
    const { assigned_to } = req.body;   // Employee ID

    try {
        // Use INSERT IGNORE to prevent duplicate assignments of the same employee
        const [result] = await db.query(
            'INSERT IGNORE INTO task_employees (task_id, employee_id) VALUES (?, ?)',
            [id, assigned_to]
        );

        res.json({
            ok: true,
            message: 'Task assignee added successfully',
            task_id: id,
            assigned_to
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
const getWorkingStages = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM project_workingstage ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const addEmployeeToProject = async (req, res) => {
    // UPDATED: Now accepting 'role' from the request body
    const { project_id, employee_ids, role } = req.body; 
console.log(req.body);

    if (!project_id || !employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
        return res.status(400).json({ error: 'Project ID and an array of Employee IDs are required' });
    }

    try {
        
        const assignedRole = role || 'Member';
        const values = employee_ids.map(emp_id => [project_id, emp_id, assignedRole]);
console.log("values",values);

        // UPDATED: Using ON DUPLICATE KEY UPDATE so you can update an existing employee's role
        const [result] = await db.query(
            `INSERT INTO project_employees (project_id, employee_id, position) 
             VALUES ? 
             ON DUPLICATE KEY UPDATE position = VALUES(position)`,
            [values]
        );

        res.status(201).json({
            message: 'Employees successfully added/updated in the project',
            addedCount: result.affectedRows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// const getProjectEmployees = async (req, res) => {
//     const { project_id } = req.params;

//     if (!project_id) {
//         return res.status(400).json({ error: "Project ID is required" });
//     }

//     try {
//         const query = `
//             SELECT
//                 pe.project_id,
//                 pe.employee_id,
//                 pos.status_name AS position_name,
//                 e.name AS employee_name,
//                 e.avatar AS image,
//                 p.name AS project_name
//             FROM project_employees pe
//             INNER JOIN employees e
//                 ON pe.employee_id = e.id
//             INNER JOIN projects p
//                 ON pe.project_id = p.id
//                 LEFT JOIN  statuses pos            /* 👈 Join the positions table */
//             ON pe.position = pos.id
//             WHERE pe.project_id = ?
//         `;

//         const [rows] = await db.query(query, [project_id]);

//         res.status(200).json(rows);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };


const getProjectEmployees = async (req, res) => {
    const { project_id } = req.params;

    if (!project_id) {
        return res.status(400).json({ error: "Project ID is required" });
    }

    try {
        const query = `
            SELECT
                pe.project_id,
                pe.employee_id,
                pos.status_name AS position_name,
                e.name AS employee_name,
                e.avatar AS image,
                p.name AS project_name,
                u.isonline            /* 👈 Grabs the online status from the users table */
            FROM project_employees pe
            INNER JOIN employees e
                ON pe.employee_id = e.id
            INNER JOIN projects p
                ON pe.project_id = p.id
            LEFT JOIN statuses pos
                ON pe.position = pos.id
            LEFT JOIN users u         /* 👈 Joins the users table using the user_id from employees */
                ON e.user_id = u.id
            WHERE pe.project_id = ?
        `;

        const [rows] = await db.query(query, [project_id]);

        // Optional: Ensure isonline returns as a boolean (true/false) instead of 1/0
        const formattedRows = rows.map(row => ({
            ...row,
            isonline: row.isonline === 1
        }));
console.log("formattedRows,formattedRows",formattedRows);

        res.status(200).json(formattedRows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const addSubtask = async (req, res) => {
    const { task_id, title, assigned_to } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO subtasks (task_id, title, assigned_to) VALUES (?, ?, ?)`,
            [task_id, title, assigned_to || null]
        );
        res.status(201).json({ 
            id: result.insertId, 
            task_id, 
            title, 
            assigned_to, 
            status: 'Pending' 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Get subtasks for a specific task
const getSubtasks = async (req, res) => {
    const { task_id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT s.*, e.name AS employee_name, e.avatar 
            FROM subtasks s
            LEFT JOIN employees e ON s.assigned_to = e.id
            WHERE s.task_id = ?
            ORDER BY s.created_at ASC
        `, [task_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Toggle subtask status (Pending/Completed)
const toggleSubtaskStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'Pending' or 'Completed'
    try {
        await db.query(`UPDATE subtasks SET status = ? WHERE id = ?`, [status, id]);
        res.json({ message: 'Subtask updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const getTaskEmployees = async (req, res) => {
    const { taskId } = req.params; 
    try {
        const query = `
            SELECT
                e.id AS employee_id,
                e.name AS employee_name,
                e.avatar AS image
            FROM task_employees te
            JOIN employees e ON te.employee_id = e.id
            WHERE te.task_id = ?;
        `;

        const [rows] = await db.query(query, [taskId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const getMyTasks = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get the employee ID
        const [employee] = await db.query(
            "SELECT id FROM employees WHERE user_id = ?",
            [userId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ error: "Employee not found" });
        }

        const employeeId = employee[0].id;

        // 2. Fetch the tasks assigned to the employee
        const [tasks] = await db.query(
            `
            SELECT 
                t.*, 
                p.name AS project_name 
            FROM tasks t
            JOIN task_employees te ON t.id = te.task_id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE te.employee_id = ?
            ORDER BY t.status DESC, t.end_date ASC
            `,
            [employeeId]
        );

        // 3. If no tasks exist, return an empty array immediately
        if (tasks.length === 0) {
            return res.json([]);
        }

        // 4. Extract task IDs to use in the subtasks query
        const taskIds = tasks.map(task => task.id);

        // 5. Fetch ONLY subtasks linked to these task IDs AND assigned to this employee
        const [subtasks] = await db.query(
            `
            SELECT * FROM subtasks 
            WHERE task_id IN (?) AND assigned_to = ?
            `,
            [taskIds, employeeId] // Added employeeId to the array here
        );

        // 6. Merge the subtasks into their parent tasks
        const tasksWithSubtasks = tasks.map(task => {
            return {
                ...task,
                // Filter subtasks that belong to the current task
                subtasks: subtasks.filter(sub => sub.task_id === task.id) 
            };
        });

        // 7. Send the structured response
        res.json(tasksWithSubtasks);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const updateSubtaskAssignee = async (req, res) => {
    const { id } = req.params;
    const { assigned_to } = req.body;
    
    try {
        await db.query(
            `UPDATE subtasks SET assigned_to = ? WHERE id = ?`, 
            [assigned_to || null, id]
        );
        res.json({ message: 'Subtask assignee updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getAllassignedroles = async (req, res) => {
  try {
    // Select the ID, status name, and description where the related field is 'lead_types'
    const query = `
      SELECT id, status_name, description 
      FROM statuses 
      WHERE related_field = 'Assign Role' AND is_active = 1
      ORDER BY id ASC
    `;

    // Execute the query
    const [assignedroles] = await db.execute(query);
 console.log(assignedroles);
 
    // Send the response back to the frontend
    res.status(200).json({
      message: 'Lead types fetched successfully',
      data: assignedroles
    });
    
  } catch (error) {
    console.error('Error fetching assignedroles types:', error);
    res.status(500).json({ error: 'Failed to fetch assignedroles types' });
  }
};

module.exports = {
    addProject,
    getAllProjects,
    getTask,
    addTask,
    statusUpdate,
    getWorkingStages,
    getTaskbyid,
    updateTaskAssignee,
    addEmployeeToProject,
    getProjectEmployees,
    addSubtask,
    getSubtasks,
    toggleSubtaskStatus,
    getTaskEmployees,
    getMyTasks,
    updateSubtaskAssignee,
    getAllassignedroles
};