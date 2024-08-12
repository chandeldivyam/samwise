import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (name: string) => void;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ open, onClose, onUpload }) => {
  const [meetingName, setMeetingName] = React.useState('');

  const handleUpload = () => {
    onUpload(meetingName);
    setMeetingName('');
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Enter Name</DialogTitle>
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
        <Button onClick={handleUpload} disabled={!meetingName}>
          Upload Now
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadDialog;
