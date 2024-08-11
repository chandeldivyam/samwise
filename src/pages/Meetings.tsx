import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { FiberManualRecord } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import MeetingList from '../components/MeetingList';
import MeetingDialog from '../components/MeetingDialog';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Meeting, SettingItem, Setting } from '../types/global';
import { listen } from '@tauri-apps/api/event';
import { path } from '@tauri-apps/api';
import { sanitizeFileName } from '../utils/utils';
/*
  TODO - (Divyam): We need to handle the case where person moves between pages while recording is being processed
  This should be driven by the tauri backend to tell that if the recording has started or not. if yes, we can start recording. Tell then it should be a loader
*/
const Meetings: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [disableRecordingButton, setDisableRecordingButton] = useState(false);
  const navigate = useNavigate();
  const { user, updateMeeting, appSettings, showMessage } = useGlobalContext();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const intervalId = useRef<NodeJS.Timeout | null>(null); // Add a ref to store the interval ID

  useEffect(() => {
    if (user) {
      fetchMeetings();

      const unlistenProcessing = listen('recording_processed', (event: any) => {
        const processedMeetingId = event.payload as number;
        setMeetings(prevMeetings =>
          prevMeetings.map(meeting =>
            meeting.id === processedMeetingId ? { ...meeting, status: 'Processing_completed' } : meeting
          )
        );
        // Ideally we should not update from here
        updateMeeting(processedMeetingId, { status: 'Processing_completed' });
      });

      const unlistenTranscription = listen('transcription_completed', (event: any) => {
        fetchMeetings(); // Refetch all meetings to get the updated data
      });

      return () => {
        unlistenProcessing.then(f => f());
        unlistenTranscription.then(f => f());
      };
    }
  }, [user]);

  useEffect(() => {
    const unlistenRecordingStarted = listen('recording_started', (event: any) => {
      const recordingMeetingId = event.payload as number;
      setRecording(true);
      setRecordingTime(0);
  
      intervalId.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);

      // We need to get the recording item and update the meeting state
      fetchMeetings();
    });
  
    const unlistenRecordingStopped = listen('recording_stopped', (event: any) => {
      setRecording(false);
      setRecordingTime(0);
      setDisableRecordingButton(false);
  
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
      fetchMeetings();
    });
  
    // We need to fetch the recordings as well with new state

    return () => {
      unlistenRecordingStarted.then(f => f());
      unlistenRecordingStopped.then(f => f());
    };
  }, []);

  useEffect(() => {
    const checkRecordingState = async () => {
      if (user) {
        try {
          const fetchedMeetings = await fetchMeetings();
          let currentRecording;
  
          if (fetchedMeetings) {
            currentRecording = fetchedMeetings.find(meeting => meeting.status === 'Recording');
          }
  
          if (currentRecording) {
            if (!intervalId.current) {
              setRecording(true);
              setRecordingTime(Math.floor((new Date().getTime() - new Date(currentRecording.created_at).getTime()) / 1000));
              intervalId.current = setInterval(() => {
                setRecordingTime(prevTime => prevTime + 1);
              }, 1000);
            }
          }
        } catch (error) {
          console.error('Failed to check recording state:', error);
        }
      }
    };
  
    checkRecordingState();
  
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [user]);

  const fetchMeetings = async () => {
    if (user) {
      try {
        const fetchedMeetings = await invoke<Meeting[]>('get_all_recordings', { userId: user.id });
        setMeetings(fetchedMeetings);
        return fetchedMeetings;
      } catch (error) {
        console.error('Failed to fetch meetings:', error);
      }
    }
  };

  const handleRecord = () => {
    setOpenDialog(true);
  };

  const handleStartRecording = async (name: string) => {
    setOpenDialog(false);

    if (user && appSettings) {
        try {
            // Generate a unique filename using name and timestamp
            const timestamp = new Date().getTime();
            const name_samatized = sanitizeFileName(name);
            const fileName = `${name_samatized.replace(/\s+/g, '_')}_${timestamp}.mp3`;
            // appSettings is an array of objects where each object has a setting_type we need to find the object with setting_type as "default"
            const defaultSettings = appSettings.find(setting => setting.setting_type === 'default') 
            if (!defaultSettings || !defaultSettings.value) {
              console.error('Default settings not found');
              return;
            }

            const allDefaultSettings: SettingItem[] = JSON.parse(defaultSettings.value);
            const recordingDirectorySetting = allDefaultSettings.find(setting => setting.id === 'recordingDirectory')

            if (!recordingDirectorySetting || !recordingDirectorySetting.value || typeof(recordingDirectorySetting.value) !== 'string') {
              console.error('Recording directory not found');
              return;
            }

            const filePath = await path.join(recordingDirectorySetting.value, fileName);

            // Create the recording, which will automatically start it
            await invoke<number>('create_recording', {
                recording: {
                    user_id: user.id,
                    name,
                    status: 'Recording',
                    created_at: new Date().toISOString(),
                    file_path: filePath 
                }
            });
        } catch (error) {
            console.error('Failed to create recording:', error);
        }
    }
};

  const handleStopRecording = async (meetingId: number) => {
    if (user) {
      try {
        setDisableRecordingButton(true);
        await invoke('process_recording', { id: meetingId });
      } catch (error) {
        console.error('Failed to update recording:', error);
      }
    }
  };

  const handleTranscribe = async (id: number) => {
    try {
      setMeetings(prevMeetings =>
        prevMeetings.map(meeting =>
          meeting.id === id ? { ...meeting, status: 'Transcribing' } : meeting
        )
      );

      await invoke('transcribe_recording', { id });
    } catch (error) {
      showMessage(`${error}`, 'error');
      setMeetings(prevMeetings =>
        prevMeetings.map(meeting =>
          meeting.id === id ? { ...meeting, status: 'Processing_completed' } : meeting
        )
      );
    }
  };
  
  const handleSelectMeeting = (id: number) => {
    navigate(`/meetings/${id}`);
  };

  return (
    <div>
      <Box display="flex" justifyContent="flex-end" alignItems="center" p={2}>
        {recording ? (
          <>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography variant="body1" sx={{ mr: 2 }}>
              Recording: {recordingTime}s
            </Typography>
            <Button disabled={disableRecordingButton} variant="contained" color="error" onClick={() => handleStopRecording(meetings[meetings.length - 1].id)}>
              Stop
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            color="primary"
            startIcon={<FiberManualRecord />}
            onClick={handleRecord}
          >
            Start Recording
          </Button>
        )}
      </Box>

      <MeetingDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onStartRecording={handleStartRecording}
      />

      <MeetingList
        meetings={meetings}
        onTranscribe={handleTranscribe}
        onSelect={handleSelectMeeting}
      />
    </div>
  );
};

export default Meetings;