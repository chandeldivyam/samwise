import React, { useState, useEffect } from 'react';
import { Typography, TextField, Switch, FormControlLabel, Button, Box, CircularProgress } from '@mui/material';
import { open } from '@tauri-apps/api/dialog';
import { useGlobalContext } from '../contexts/GlobalContext';

interface DefaultSettings {
  name: string;
  recordingDirectory: string;
  autoProcess: boolean;
}

const Settings: React.FC = () => {
  const { user, defaultSettings, loading: globalLoading, updateDefaultSettings } = useGlobalContext();
  const [settings, setSettings] = useState<DefaultSettings>({
    name: '',
    recordingDirectory: '',
    autoProcess: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultSettings) {
      setSettings(defaultSettings);
    }
  }, [defaultSettings]);

  useEffect(() => {
    console.log('Settings updated:', settings);
  }, [settings]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = event.target;
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: name === 'autoProcess' ? checked : value,
    }));
  };

  const handleDirectorySelect = async () => {
    const selected = await open({
      directory: true,
    });
    console.log('Directory selected:', selected);
    if (typeof selected === 'string') {
      setSettings(prevSettings => ({
        ...prevSettings,
        recordingDirectory: selected,
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
  
    try {
      setLoading(true);
      console.log("Saving settings", settings);
      await updateDefaultSettings(settings);
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (globalLoading) {
    return <CircularProgress />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, margin: 'auto' }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>

      <TextField
        fullWidth
        margin="normal"
        label="Name"
        name="name"
        value={settings.name}
        onChange={handleChange}
      />

      <TextField
        fullWidth
        margin="normal"
        label="Recording Directory"
        name="recordingDirectory"
        value={settings.recordingDirectory}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <Button onClick={handleDirectorySelect}>Browse</Button>
          ),
        }}
      />

      <FormControlLabel
        control={
          <Switch
            checked={settings.autoProcess}
            onChange={handleChange}
            name="autoProcess"
          />
        }
        label="Automatically process recordings"
      />

      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={loading}>
        {loading ? <CircularProgress size={24} /> : 'Save Settings'}
      </Button>
    </Box>
  );
};

export default Settings;
