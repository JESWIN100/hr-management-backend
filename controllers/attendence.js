

const db = require('../config/db');


const getallattendence= async (req, res) => {
  const { month, year } = req.query; 
  
  if (!month || !year) {
    return res.status(400).json({ message: 'Month and year are required' });
  }

  const numMonth = parseInt(month) + 1; // React sends 0-11, MySQL needs 1-12
  const numYear = parseInt(year);
  const daysInMonth = new Date(numYear, numMonth, 0).getDate();

  try {
    // Fetch from your exact employees table
    const [employees] = await db.query('SELECT id, name, avatar FROM employees');

    // Fetch attendance records for the selected month/year
    const [records] = await db.query(`
      SELECT employee_id, DAY(record_date) as day, status 
      FROM attendance 
      WHERE MONTH(record_date) = ? AND YEAR(record_date) = ?
    `, [numMonth, numYear]);

    // Format data to match React's expected array structure
    const formattedData = employees.map(emp => {
      // Create empty 31-day array
      const empRecords = Array(daysInMonth).fill('empty');
      
      // Map the DB statuses to the correct day index
      const empDbRecords = records.filter(r => r.employee_id === emp.id);
      empDbRecords.forEach(record => {
        empRecords[record.day - 1] = record.status;
      });

      // Handle missing avatars gracefully using Pravatar as a fallback or default icon
      // const avatarUrl = emp.avatar && emp.avatar !== 'null' && emp.avatar !== 'NULL' 
      //   ? `http://localhost:5000${emp.avatar}` // Assuming avatars are hosted on this server
      //   : `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`;

      return {
        id: emp.id,
        name: emp.name,
        avatar: emp.avatar,
        records: empRecords
      };
    });

    res.json(formattedData);

  } catch (error) {
    console.error('Attendance Fetch Error:', error);
    res.status(500).json({ message: 'Server error fetching attendance' });
  }
};

const getOneEmployeeAttendance = async (req, res) => {
  const { id } = req.params; // Get employee ID from the URL route
  const { month, year } = req.query; 
  
  if (!id) {
    return res.status(400).json({ message: 'Employee ID is required' });
  }
  if (!month || !year) {
    return res.status(400).json({ message: 'Month and year are required' });
  }

  // CORRECTED: React is already sending 1-12 based on your monthsList
  const numMonth = parseInt(month); 
  const numYear = parseInt(year);
  const daysInMonth = new Date(numYear, numMonth, 0).getDate();

  try {
    // 1. Fetch the specific employee
    const [employees] = await db.query('SELECT id, name, avatar FROM employees WHERE id = ?', [id]);

    if (employees.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const emp = employees[0];

    // 2. Fetch attendance records for just this employee
    const [records] = await db.query(`
      SELECT DAY(record_date) as day, status 
      FROM attendance 
      WHERE employee_id = ? AND MONTH(record_date) = ? AND YEAR(record_date) = ?
    `, [id, numMonth, numYear]);

    // 3. Format data to match your 31-day array structure
    const empRecords = Array(daysInMonth).fill('empty');
    
    records.forEach(record => {
      empRecords[record.day - 1] = record.status;
    });

    // const avatarUrl = emp.avatar && emp.avatar !== 'null' && emp.avatar !== 'NULL' 
    //   ? `http://localhost:5000${emp.avatar}` 
    //   : `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`;

    // 4. Return the single formatted employee object
    const formattedData = {
      id: emp.id,
      name: emp.name,
      avatar: emp.avatar,
      records: empRecords
    };

    res.json(formattedData);

  } catch (error) {
    console.error('Single Attendance Fetch Error:', error);
    res.status(500).json({ message: 'Server error fetching attendance' });
  }
};

const getYearlyEmployeeAttendance = async (req, res) => {
  const { id } = req.params; // Get employee ID from the URL route
  const { year } = req.query; // Get year from query params

  if (!id) {
    return res.status(400).json({ message: 'Employee ID is required' });
  }
  if (!year) {
    return res.status(400).json({ message: 'Year is required' });
  }

  const numYear = parseInt(year);

  try {
    // 1. Verify the employee exists (optional but good practice)
    const [employees] = await db.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (employees.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // 2. Fetch all attendance records for this employee for the entire year
    // Extract both MONTH and DAY from the record_date
    const [records] = await db.query(`
      SELECT MONTH(record_date) as month, DAY(record_date) as day, status 
      FROM attendance 
      WHERE employee_id = ? AND YEAR(record_date) = ?
    `, [id, numYear]);

    // 3. Initialize the yearly data structure expected by the frontend
    // Result format: { 1: ['empty', 'empty', ...], 2: [...], ..., 12: [...] }
    const yearlyData = {};

    for (let m = 1; m <= 12; m++) {
      // Calculate how many days are in this specific month
      const daysInMonth = new Date(numYear, m, 0).getDate();
      // Fill the month array with 'empty' default values
      yearlyData[m] = Array(daysInMonth).fill('empty');
    }

    // 4. Populate the initialized structure with actual database records
    records.forEach(record => {
      const month = record.month; // 1 to 12
      const dayIndex = record.day - 1; // 0 to 30
      
      // Update the status for that specific day
      if (yearlyData[month] && yearlyData[month][dayIndex] !== undefined) {
         yearlyData[month][dayIndex] = record.status;
      }
    });

    // 5. Send the mapped object directly to the frontend
    res.json(yearlyData);

  } catch (error) {
    console.error('Yearly Attendance Fetch Error:', error);
    res.status(500).json({ message: 'Server error fetching yearly attendance' });
  }
};


module.exports = { getallattendence,getOneEmployeeAttendance ,getYearlyEmployeeAttendance};