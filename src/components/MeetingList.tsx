import React from 'react';
import { Grid } from '@mui/material';
import MeetingCard from './MeetingCard';
import { Meeting } from '../types/global'

interface MeetingListProps {
  meetings: Meeting[];
  onTranscribe: (id: number) => void;
  onSelect: (id: number) => void;
}

const MeetingList: React.FC<MeetingListProps> = ({ meetings, onTranscribe, onSelect }) => {
  return (
    <Grid container spacing={3}>
      {meetings.map((meeting) => (
        <Grid item xs={12} md={6} lg={4} key={meeting.id}>
          <MeetingCard meeting={meeting} onTranscribe={onTranscribe} onSelect={onSelect} />
        </Grid>
      ))}
    </Grid>
  );
};

export default MeetingList;
