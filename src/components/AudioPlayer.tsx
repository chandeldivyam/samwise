import React, { useState, useEffect, RefObject } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { PlayArrow, Pause } from '@mui/icons-material';
import { useGlobalContext } from '../contexts/GlobalContext';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { exists } from '@tauri-apps/api/fs';

interface AudioPlayerProps {
  filePath: string;
  onTimeUpdate?: (time: number) => void;
  audioRef?: RefObject<HTMLAudioElement>;
  onSeeked?: () => void;  // New prop added here
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ filePath, onTimeUpdate, audioRef, onSeeked }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const internalAudioRef = React.useRef<HTMLAudioElement>(null);
  const { showMessage } = useGlobalContext();

  const actualAudioRef = audioRef || internalAudioRef;

  const handlePlayPause = () => {
    if (actualAudioRef.current) {
      if (isPlaying) {
        actualAudioRef.current.pause();
      } else {
        actualAudioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (actualAudioRef.current) {
      const time = actualAudioRef.current.currentTime;
      setCurrentTime(time);
      if (onTimeUpdate) {
        onTimeUpdate(time);
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadAudio = async () => {
      try {
        if (await exists(filePath)) {
          const audioUrl = convertFileSrc(filePath);
          if (actualAudioRef.current) {
            actualAudioRef.current.src = audioUrl;
            actualAudioRef.current.addEventListener('loadedmetadata', () => {
              setDuration(actualAudioRef.current!.duration);
            });
          }
        } else {
          showMessage(`Audio file not found: ${filePath}`, 'error');
        }
      } catch (error) {
        showMessage(`Failed to load audio: ${error}`, 'error');
      }
    };
    loadAudio();
  }, [filePath]);

  useEffect(() => {
    if (actualAudioRef.current && onSeeked) {
      actualAudioRef.current.addEventListener('seeked', onSeeked);
    }
    return () => {
      if (actualAudioRef.current && onSeeked) {
        actualAudioRef.current.removeEventListener('seeked', onSeeked);
      }
    };
  }, [onSeeked]);

  return (
    <Box sx={{ width: '100%', my: 2 }}>
      <audio ref={actualAudioRef} onTimeUpdate={handleTimeUpdate} />
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={handlePlayPause}>
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>
        <Typography variant="body2" sx={{ ml: 1 }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Typography>
      </Box>
    </Box>
  );
};

export default AudioPlayer;
