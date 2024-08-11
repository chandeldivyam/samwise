import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Box, Tabs, Tab, Paper, Grid, Slider } from '@mui/material';
import { styled } from '@mui/system';
import moment from 'moment';
import { invoke } from '@tauri-apps/api/tauri';
import { Meeting } from '../types/global';
import AudioPlayer from '../components/AudioPlayer';
import TranscriptViewer from '../components/TranscriptViewer';
import SummarySection from '../components/SummarySection';
import { useGlobalContext } from '../contexts/GlobalContext';
import ChatSection from '../components/ChatSection';
import { GeminiChatHistory } from '../types/global';

const FixedTopBar = styled(Paper)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  padding: theme.spacing(2),
}));

const ContentArea = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const MeetingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedTab, setSelectedTab] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const { updateMeeting } = useGlobalContext();
  const [chatHistory, setChatHistory] = useState<GeminiChatHistory[]>([]);

  useEffect(() => {
    if (id) {
      fetchMeeting(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    if (selectedTab === 0) {
      scrollToCurrentTime(currentTime);
    }
  }, [currentTime, selectedTab]);

  const fetchMeeting = async (meetingId: number) => {
    try {
      const fetchedMeeting = await invoke<Meeting>('get_recording', { id: meetingId });
      setMeeting(fetchedMeeting);
    } catch (error) {
      console.error('Failed to fetch meeting:', error);
    }
  };

  const updateChatHistory = async (newHistory: GeminiChatHistory[]) => {
    try {
      setChatHistory(newHistory);
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    if (selectedTab === 0) {
      scrollToCurrentTime(time);
    }
  };

  const scrollToCurrentTime = (time: number) => {
    if (transcriptRef.current) {
      const element = transcriptRef.current.querySelector(`[data-time="${Math.floor(time)}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };
  
  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (audioRef.current && typeof newValue === 'number') {
      audioRef.current.currentTime = newValue;
      setCurrentTime(newValue);
      scrollToCurrentTime(newValue);
    }
  };

  const handleAudioSeeked = () => {
    if (selectedTab === 0) {
      scrollToCurrentTime(audioRef.current?.currentTime || 0);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    if (newValue === 0) {
      scrollToCurrentTime(currentTime);
    }
  };

  const getTranscript = () => {
    if (meeting && meeting.transcription) {
      const transcriptData = JSON.parse(meeting.transcription);
      return transcriptData.results.channels[0].alternatives[0].transcript;
    }
    return '';
  };

  const handleSummaryUpdate = async (newSummary: string) => {
    if (meeting) {
      await updateMeeting(meeting.id, { summary: newSummary });
      setMeeting({ ...meeting, summary: newSummary });
    }
  };

  if (!meeting) return <Typography>Loading...</Typography>;
  if (meeting.status === 'Processing_completed') {
    return (<Box>
      <FixedTopBar elevation={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5">{meeting.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {moment(meeting.created_at).format('MMMM D, YYYY [at] h:mm A')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <AudioPlayer
              filePath={meeting.file_path}
              onTimeUpdate={handleTimeUpdate}
              audioRef={audioRef}
              onSeeked={handleAudioSeeked}
            />
            <Slider
              value={currentTime}
              max={audioRef.current?.duration || 0}
              onChange={handleSliderChange}
              aria-label="audio progress"
            />
          </Grid>
        </Grid>
      </FixedTopBar>
    </Box>)
  }

  if (!meeting.transcription) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <FixedTopBar elevation={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5">{meeting.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {moment(meeting.created_at).format('MMMM D, YYYY [at] h:mm A')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <AudioPlayer
              filePath={meeting.file_path}
              onTimeUpdate={handleTimeUpdate}
              audioRef={audioRef}
              onSeeked={handleAudioSeeked}
            />
            <Slider
              value={currentTime}
              max={audioRef.current?.duration || 0}
              onChange={handleSliderChange}
              aria-label="audio progress"
            />
          </Grid>
        </Grid>
      </FixedTopBar>

      <ContentArea>
        <Tabs value={selectedTab} onChange={handleTabChange} centered>
          <Tab label="Transcript" />
          <Tab label="Summary" />
          <Tab label="Chat" />
          <Tab label="Automations" disabled />
        </Tabs>

        {selectedTab === 0 && (
          <div ref={transcriptRef}>
            <TranscriptViewer
              transcript={meeting.transcription}
              currentTime={currentTime}
              onTimeClick={(time) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = time;
                  setCurrentTime(time);
                }
              }}
            />
          </div>
        )}
        {selectedTab === 1 && (
          <Paper sx={{ p: 2 }}>
            <SummarySection
              transcript={getTranscript()}
              initialSummary={meeting.summary || ''}
              onSummaryUpdate={handleSummaryUpdate}
            />
          </Paper>
        )}
        {selectedTab === 2 && (
          <Paper sx={{ p: 2 }}>
            <ChatSection
              transcript={getTranscript()}
              summary={meeting.summary || ''}
              chatHistory={chatHistory}
              onChatHistoryUpdate={updateChatHistory}
            />
          </Paper>
        )}
      </ContentArea>
    </Box>
  );
};
export default MeetingDetailsPage;
