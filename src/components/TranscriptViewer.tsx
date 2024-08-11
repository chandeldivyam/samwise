import React from 'react';
import { Typography, Box, Chip } from '@mui/material';
import { styled } from '@mui/system';

interface TranscriptViewerProps {
  transcript: string;
  currentTime: number;
  onTimeClick: (time: number) => void;
}

interface Sentence {
  text: string;
  start: number;
  end: number;
}

interface Paragraph {
  sentences: Sentence[];
  speaker: number;
  num_words: number;
  start: number;
  end: number;
}

const SpeakerChip = styled(Chip)(({ theme }) => ({
  marginRight: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

const TimestampButton = styled('button')(({ theme }) => ({
  background: 'none',
  border: 'none',
  color: theme.palette.primary.main,
  cursor: 'pointer',
  fontSize: '0.8rem',
  padding: 0,
  marginRight: theme.spacing(1),
  '&:hover': {
    textDecoration: 'underline',
  },
}));

const ParagraphBox = styled(Box)<{ isActive: boolean }>(({ theme, isActive }) => ({
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: isActive ? theme.palette.action.selected : 'transparent',
  transition: 'background-color 0.3s',
}));

const formatTimestamp = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ transcript, currentTime, onTimeClick }) => {
  const parsedTranscript = JSON.parse(transcript);
  const paragraphs: Paragraph[] = parsedTranscript.results.channels[0].alternatives[0].paragraphs.paragraphs;

  return (
    <Box>
      {paragraphs.map((paragraph, index) => (
        <ParagraphBox
          key={index}
          isActive={currentTime >= paragraph.start && currentTime < paragraph.end}
          data-time={Math.floor(paragraph.start)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <SpeakerChip label={`Speaker ${paragraph.speaker}`} color="primary" size="small" />
            <TimestampButton onClick={() => onTimeClick(paragraph.start)}>
              {formatTimestamp(paragraph.start)}
            </TimestampButton>
          </Box>
            <Typography  variant="body1" sx={{ mb: 1 }}>
              {paragraph.sentences.map((sentence) => sentence.text).join(' ')}
            </Typography>
        </ParagraphBox>
      ))}
    </Box>
  );
};

export default TranscriptViewer;
