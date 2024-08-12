import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  CircularProgress,
  Button,
} from '@mui/material';
import { FiberManualRecord, CheckCircleOutline, HourglassEmpty } from '@mui/icons-material';
import moment from 'moment';
import { Meeting } from '../types/global'

interface MeetingCardProps {
  meeting: Meeting;
  onTranscribe: (id: number) => void;
  onSelect: (id: number) => void;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onTranscribe, onSelect }) => {
  return (
    <Card 
      onClick={() => onSelect(meeting.id)}
      sx={{
        ':hover': {
          boxShadow: 5, // Enhanced shadow on hover
          cursor: 'pointer', // Change cursor to pointer on hover
        },
      }}
    >
      <CardContent>
        <Typography variant="h5" component="div">
          {meeting.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Created: {moment(meeting.created_at).fromNow()}
        </Typography>
        <Box display="flex" alignItems="center" mt={1}>
          {meeting.status === 'Recording' && (
            <>
              <FiberManualRecord color="error" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Recording...
              </Typography>
              <LinearProgress sx={{ ml: 1, flexGrow: 1 }} />
            </>
          )}
          {meeting.status === 'Processing' && (
            <>
              <HourglassEmpty color="warning" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Processing...
              </Typography>
              <CircularProgress size={20} sx={{ ml: 1 }} />
            </>
          )}
          {meeting.status === 'Processing_completed' && (
            <>
              <CheckCircleOutline color="info" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Ready to Transcribe
              </Typography>
            </>
          )}
          {meeting.status === 'Transcribing' && (
            <>
              <HourglassEmpty color="warning" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Transcribing...
              </Typography>
              <CircularProgress size={20} sx={{ ml: 1 }} />
            </>
          )}
          {meeting.status === 'Completed' && (
            <>
              <CheckCircleOutline color="success" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </>
          )}
        </Box>
        {meeting.status === 'Processing_completed' && (
          <Button
            variant="outlined"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              onTranscribe(meeting.id);
            }}
            sx={{ mt: 2 }}
          >
            Transcribe Now
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default MeetingCard;