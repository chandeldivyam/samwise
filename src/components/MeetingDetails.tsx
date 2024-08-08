// .\src\components\MeetingDetails.tsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import moment from 'moment';
import { Meeting } from '../types/global'

interface MeetingDetailsProps {
  meeting: Meeting | null;
  onClose: () => void;
}

const MeetingDetails: React.FC<MeetingDetailsProps> = ({ meeting, onClose }) => {
  if (!meeting) return null;

  return (
    <Dialog open={Boolean(meeting)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{meeting.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Created: {moment(meeting.createdAt).fromNow()}
        </Typography>
        {meeting.status === 'Completed' && (
          <>
            <Typography variant="body2" mt={2}>
              {meeting.summary}
            </Typography>
            <Typography variant="body2" mt={2}>
              {meeting.transcription}
            </Typography>
            <Typography variant="body2" mt={2}>
              {meeting.action_items}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingDetails;
