import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { FiberManualRecord, Stop, Sort, CloudUpload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import MeetingList from '../components/MeetingList';
import MeetingDialog from '../components/MeetingDialog';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Meeting, SettingItem } from '../types/global';
import { listen } from '@tauri-apps/api/event';
import { path } from '@tauri-apps/api';
import { sanitizeFileName } from '../utils/utils';
import { open } from '@tauri-apps/api/dialog';
import UploadDialog from '../components/UploadDialog';

const Meetings: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [disableRecordingButton, setDisableRecordingButton] = useState(false);
  const navigate = useNavigate();
  const { user, updateMeeting, appSettings, showMessage } = useGlobalContext();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const filterStatus = '';
  const [sortKey, setSortKey] = useState<'name' | 'created_at'>('created_at');
  const [filterName, setFilterName] = useState<string>('');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);

  const handleSortToggle = () => {
    setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
  };

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
        updateMeeting(processedMeetingId, { status: 'Processing_completed' });
      });

      const unlistenTranscription = listen('transcription_completed', () => {
        fetchMeetings();
      });

      return () => {
        unlistenProcessing.then(f => f());
        unlistenTranscription.then(f => f());
      };
    }
  }, [user]);

  useEffect(() => {
    const unlistenRecordingStarted = listen('recording_started', () => {
      setRecording(true);
      setRecordingTime(0);
  
      intervalId.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);

      fetchMeetings();
    });
  
    const unlistenRecordingStopped = listen('recording_stopped', () => {
      setRecording(false);
      setRecordingTime(0);
      setDisableRecordingButton(false);
  
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
      fetchMeetings();
    });

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

  const handleUpload = () => {
    setOpenUploadDialog(true);
  }

  const handleStartRecording = async (name: string) => {
    setOpenDialog(false);

    if (user && appSettings) {
      try {
        const timestamp = new Date().getTime();
        const name_samatized = sanitizeFileName(name);
        const fileName = `${name_samatized.replace(/\s+/g, '_')}_${timestamp}.mp3`;
        const defaultSettings = appSettings.find(setting => setting.setting_type === 'default');
        if (!defaultSettings || !defaultSettings.value) {
          console.error('Default settings not found');
          return;
        }

        const allDefaultSettings: SettingItem[] = JSON.parse(defaultSettings.value);
        const recordingDirectorySetting = allDefaultSettings.find(setting => setting.id === 'recordingDirectory');

        if (!recordingDirectorySetting || !recordingDirectorySetting.value || typeof(recordingDirectorySetting.value) !== 'string') {
          console.error('Recording directory not found');
          return;
        }

        const filePath = await path.join(recordingDirectorySetting.value, fileName);

        await invoke<number>('create_recording', {
          recording: {
            user_id: user.id,
            name,
            status: 'Recording',
            created_at: new Date().toISOString(),
            file_path: filePath,
          },
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
  
  const handleFileUpload = async (name: string) => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Audio',
          extensions: ['mp3']
        }]
      });
      if (selected === null) {
        showMessage("Please choose a file", 'error')
        return;
      }

      if (Array.isArray(selected)) {
        showMessage("Please upload 1 file at a time", 'error');
        return;
      }

      await invoke<number>('upload_recording', {
        recording: {
          user_id: user?.id,
          file_path: selected,
          name: name,
          status: 'Processing_completed',
          created_at: new Date().toISOString(),
        }
      })

      await fetchMeetings();
      setOpenUploadDialog(false)
    } catch (error) {
      showMessage("Failed to upload file", 'error')
    }

  }

  const handleSelectMeeting = (id: number) => {
    navigate(`/meetings/${id}`);
  };

  const sortedAndFilteredMeetings = meetings
    .filter(meeting =>
      (filterStatus === '' || meeting.status === filterStatus) &&
      (filterName === '' || meeting.name.toLowerCase().includes(filterName.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortKey === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
        {/* Left Side: Recording Button */}
        <Box display="flex" alignItems="center">
          <Button
            variant="contained"
            color={recording ? "error" : "primary"}
            startIcon={recording ? <Stop /> : <FiberManualRecord />}
            onClick={recording ? () => handleStopRecording(meetings[meetings.length - 1].id) : handleRecord}
            disabled={disableRecordingButton}
            sx={{ mr: 2 }} // Add right margin for spacing
          >
            {recording ? 'Stop' : 'Record'}
          </Button>
          {recording && (
            <Typography variant="body2" sx={{ ml: 1 }}>
              {recordingTime}s
            </Typography>
          )}
          <CloudUpload onClick={handleUpload} />
        </Box>

        {/* Right Side: Filters and Sorting */}
        <Box display="flex" alignItems="center">
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            sx={{ mr: 2 }}
          />
          <FormControl variant="outlined" size="small" sx={{ mr: 2 }}>
            <InputLabel htmlFor="sort-key">Sort By</InputLabel>
            <Select
              id="sort-key"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as 'name' | 'created_at')}
              label="Sort By"
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="created_at">Date</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Sort />}
            onClick={handleSortToggle}
            size="small"
          >
            {sortOrder === 'asc' ? 'Asc' : 'Desc'}
          </Button>
        </Box>
      </Box>

      {/* Meeting List */}
      <Box p={2}>
        <MeetingList
          meetings={sortedAndFilteredMeetings}
          onTranscribe={handleTranscribe}
          onSelect={handleSelectMeeting}
        />
      </Box>

      {/* Dialog for Starting Recording */}
      <MeetingDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onStartRecording={handleStartRecording}
      />
      <UploadDialog
        open={openUploadDialog}
        onClose={() => setOpenUploadDialog(false)}
        onUpload={handleFileUpload}
      />
    </div>
  );
};

export default Meetings;
