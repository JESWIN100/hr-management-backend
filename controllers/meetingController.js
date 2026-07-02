


// Node.js Backend
const { google } = require('googleapis');

// Set up your Google Auth client here
const auth = new google.auth.GoogleAuth({
  keyFile: './path-to-your-google-credentials.json', 
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
});

const calendar = google.calendar({ version: 'v3', auth });
let activeProjectMeetings = {}; 


const createMeeting =async (req, res) => {
//   const { project_id, lead_id } = req.body;
const project_id=1
 const lead_id=1  
try {
    const event = {
      summary: `Project Meeting: ${project_id}`,
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString() }, // 1 hour later
      conferenceData: {
        createRequest: {
          requestId: `meet_${project_id}_${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.hangoutLink;

    console.log("res,meetLink",response);
    console.log("meetLink,meetLink");
    

    // Store the active meeting in your database/memory
    activeProjectMeetings[project_id] = {
      meetLink,
      lead_id,
      startedAt: new Date()
    };

    res.json({ success: true, meetLink });
  } catch (error) {
    console.error('Error creating Google Meet:', error);
    res.status(500).json({ error: 'Failed to generate Meet link' });
  }
}

// Endpoint for members to check if a meeting is active
const getmeeting=async (req, res) => {
  const { project_id } = req.params;
  const meeting = activeProjectMeetings[project_id];
  
  if (meeting) {
    res.json({ active: true, meetLink: meeting.meetLink });
  } else {
    res.json({ active: false });
  }
}

module.exports={
    createMeeting,getmeeting
}