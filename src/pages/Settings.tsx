import React, { useState, useEffect } from 'react';
import { Typography, TextField, Switch, FormControlLabel, Button, Box, CircularProgress, Alert, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { open } from '@tauri-apps/api/dialog';
import { useGlobalContext } from '../contexts/GlobalContext';
import { SettingItem, Setting } from '../types/global';

const Settings: React.FC = () => {
  const { appSettings, updateSettings, loading } = useGlobalContext();
  const [localSettings, setLocalSettings] = useState<Setting[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (appSettings) {
      setLocalSettings(appSettings);
    }
  }, [appSettings]);

  const handleTogglePasswordVisibility = (itemId: string) => {
    setShowPasswords(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSettingChange = (settingType: string, itemId: string, value: any) => {
    setLocalSettings(prevSettings =>
      prevSettings.map(setting => {
        if (setting.setting_type === settingType) {
          const parsedValue = JSON.parse(setting.value);
          const updatedValue = parsedValue.map((item: SettingItem) =>
            item.id === itemId ? { ...item, value } : item
          );
          return { ...setting, value: JSON.stringify(updatedValue) };
        }
        return setting;
      })
    );
    // Clear error for this field if it exists
    if (errors[itemId]) {
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors[itemId];
        return newErrors;
      });
    }
  };

  const handleDirectorySelect = async (settingType: string, itemId: string) => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      handleSettingChange(settingType, itemId, selected as string);
    }
  };

  const validateSettings = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    localSettings.forEach(setting => {
      const parsedValue = JSON.parse(setting.value);
      parsedValue.forEach((item: SettingItem) => {
        if (item.mandatory && item.showInSettings) {
          if (item.type === 'string' && (!item.value || (item.value as string).trim() === '')) {
            newErrors[item.id] = `${item.title} is required`;
            isValid = false;
          }
          // Add more validation rules for other types if needed
        }
      });
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSaveSettings = async () => {
    if (validateSettings()) {
      try {
        await updateSettings(localSettings);
        setSaveStatus('success');
      } catch (error) {
        console.error('Failed to save settings:', error);
        setSaveStatus('error');
      }
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ maxWidth: 600, margin: 'auto', padding: 2 }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      {saveStatus === 'success' && (
        <Alert severity="success" sx={{ marginBottom: 2 }}>Settings saved successfully!</Alert>
      )}
      {saveStatus === 'error' && (
        <Alert severity="error" sx={{ marginBottom: 2 }}>Failed to save settings. Please try again.</Alert>
      )}
      {localSettings.map((setting) => (
        <Box key={setting.setting_type} sx={{ marginBottom: 4 }}>
          <Typography variant="h6" gutterBottom>{setting.title}</Typography>
          {JSON.parse(setting.value).map((item: SettingItem) => (
            item.showInSettings && (
              <Box key={item.id} sx={{ marginBottom: 2 }}>
                {item.type === 'string' && !item.secret && (
                  <TextField
                    fullWidth
                    label={item.title}
                    value={item.value}
                    onChange={(e) => handleSettingChange(setting.setting_type, item.id, e.target.value)}
                    helperText={errors[item.id] || item.description}
                    error={!!errors[item.id]}
                    required={item.mandatory}
                  />
                )}
                {item.type === 'string' && item.secret && (
                  <TextField
                    fullWidth
                    label={item.title}
                    type={showPasswords[item.id] ? 'text' : 'password'}
                    value={item.value}
                    onChange={(e) => handleSettingChange(setting.setting_type, item.id, e.target.value)}
                    helperText={errors[item.id] || item.description}
                    error={!!errors[item.id]}
                    required={item.mandatory}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => handleTogglePasswordVisibility(item.id)}
                            edge="end"
                          >
                            {showPasswords[item.id] ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                {item.type === 'boolean' && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={item.value as boolean}
                        onChange={(e) => handleSettingChange(setting.setting_type, item.id, e.target.checked)}
                      />
                    }
                    label={item.title}
                  />
                )}
                {item.id === 'recordingDirectory' && (
                  <Button
                    variant="outlined"
                    onClick={() => handleDirectorySelect(setting.setting_type, item.id)}
                    sx={{ marginTop: 1 }}
                  >
                    Select Directory
                  </Button>
                )}
              </Box>
            )
          ))}
        </Box>
      ))}
      <Button variant="contained" onClick={handleSaveSettings}>
        Save Settings
      </Button>
    </Box>
  );
};

export default Settings;