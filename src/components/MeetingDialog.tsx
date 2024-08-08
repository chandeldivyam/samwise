import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

interface MeetingDialogProps {
  open: boolean;
  onClose: () => void;
  onStartRecording: (name: string) => void;
}

const MeetingDialog: React.FC<MeetingDialogProps> = ({ open, onClose, onStartRecording }) => {
  const [meetingName, setMeetingName] = React.useState('');

  const handleStartRecording = () => {
    onStartRecording(meetingName);
    setMeetingName('');
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Enter Meeting Name</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="meeting-name"
          label="Meeting Name"
          type="text"
          fullWidth
          value={meetingName}
          onChange={(e) => setMeetingName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleStartRecording} disabled={!meetingName}>
          Start Recording
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingDialog;
