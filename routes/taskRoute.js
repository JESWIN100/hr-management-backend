const express = require('express');
const router = express.Router();


const authenticate = require('../middleware/auth');
const { addProject, getAllProjects, getTask, addTask, statusUpdate, updateTaskAssignee, getWorkingStages, getTaskbyid, addEmployeeToProject, getProjectEmployees, addSubtask, getSubtasks, toggleSubtaskStatus, getTaskemployees, getTaskEmployees, getMyTasks } = require('../controllers/TaskController');

router.post('/projects',authenticate, addProject);
router.get('/projects',authenticate, getAllProjects);
router.post('/projects/add/employee',authenticate, addEmployeeToProject);
router.get('/projects/get/employee/:project_id',authenticate, getProjectEmployees);


router.get('/task/employees/:taskId',authenticate, getTaskEmployees); 

router.get('/task/myworks',authenticate, getMyTasks); 


router.get('/tasks',authenticate, getTask);
router.get('/tasks/id',authenticate, getTaskbyid);
router.get('/working-stages',authenticate, getWorkingStages);
router.post('/tasks',authenticate, addTask);
router.put('/tasks/:id/status',authenticate, statusUpdate);
router.put('/update/employeee/:id',authenticate, updateTaskAssignee);

router.post('/subtasks',authenticate, addSubtask);
router.get('/subtasks/:task_id',authenticate, getSubtasks);
router.put('/subtasks/status/:id',authenticate, toggleSubtaskStatus);

module.exports = router;