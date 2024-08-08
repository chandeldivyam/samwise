import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Box } from '@mui/material';
import moment from 'moment';
import { invoke } from '@tauri-apps/api/tauri';
import { Meeting } from '../types/global'

const MeetingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    if (id) {
      fetchMeeting(parseInt(id));
    }
  }, [id]);

  const fetchMeeting = async (meetingId: number) => {
    try {
      const fetchedMeeting = await invoke<Meeting>('get_recording', { id: meetingId });
      setMeeting(fetchedMeeting);
    } catch (error) {
      console.error('Failed to fetch meeting:', error);
    }
  };

  if (!meeting) return <Typography>Loading...</Typography>;

  return (
    <Box p={3}>
      <Typography variant="h4" component="div">
        {meeting.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Created: {moment(meeting.createdAt).fromNow()}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Status: {meeting.status}
      </Typography>
      {meeting.status === 'Completed' && (
        <>
          <Typography variant="h6" mt={2}>
            Summary
          </Typography>
          <Typography variant="body2" mt={1}>
            {meeting.summary}
          </Typography>
          <Typography variant="h6" mt={2}>
            Transcription
          </Typography>
          <Typography variant="body2" mt={1}>
            {meeting.transcription}
          </Typography>
          <Typography variant="h6" mt={2}>
            Action Items
          </Typography>
          <Typography variant="body2" mt={1}>
            {meeting.action_items}
          </Typography>
        </>
      )}
    </Box>
  );
};

export default MeetingDetailsPage;