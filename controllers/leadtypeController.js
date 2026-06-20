const db = require('../config/db');

const getAllLeadTypes = async (req, res) => {
  try {
    // Select the ID, status name, and description where the related field is 'lead_types'
    const query = `
      SELECT id, status_name, description 
      FROM statuses 
      WHERE related_field = 'lead_types' AND is_active = 1
      ORDER BY id ASC
    `;

    // Execute the query
    const [leadTypes] = await db.execute(query);
 console.log(leadTypes);
 
    // Send the response back to the frontend
    res.status(200).json({
      message: 'Lead types fetched successfully',
      data: leadTypes
    });
    
  } catch (error) {
    console.error('Error fetching lead types:', error);
    res.status(500).json({ error: 'Failed to fetch lead types' });
  }
};

module.exports = {
  // ... your other controllers like createaavisit
  getAllLeadTypes
};