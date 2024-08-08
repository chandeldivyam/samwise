// .\src\contexts\GlobalContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useNavigate } from 'react-router-dom';
import { User, DefaultSettings, GlobalContextType, Meeting } from '../types/global'

const GlobalContext = createContext<GlobalContextType>({
  user: null,
  defaultSettings: null,
  loading: true,
  setUser: () => {},
  updateDefaultSettings: async () => {},
  updateMeeting: async () => {},
});

interface GlobalProviderProps {
  children: React.ReactNode;
}

export const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [defaultSettings, setDefaultSettings] = useState<DefaultSettings | null>(null);
  const [loading, setLoading] = useState(true);  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const settings: any[] = await invoke('get_all_settings', { userId: user.id });
        const defaultSetting = settings.find(s => s.setting_type === 'default');
        if (defaultSetting) {
          setDefaultSettings(JSON.parse(defaultSetting.value));
        }
      }
      else {
        setLoading(false);
        navigate('/signup');
      }
    };

    fetchUserData();
  }, [navigate]);

  const updateDefaultSettings = async (newSettings: DefaultSettings) => {
    try {
      if (!user) throw new Error("User not found");
  
      // Update the settings in the database
      await invoke('update_setting', {
        setting: {
          user_id: user.id,
          setting_type: 'default',
          value: JSON.stringify(newSettings),
        },
      });
      
      // Refetch the settings from the database
      const settings: any[] = await invoke('get_all_settings', { userId: user.id });
      const defaultSetting = settings.find(s => s.setting_type === 'default');
      if (defaultSetting) {
        const updatedSettings = JSON.parse(defaultSetting.value);
        setDefaultSettings(updatedSettings);
      }
    } catch (error) {
      console.error('Failed to update default settings:', error);
      throw error; // Rethrow the error so it can be caught in the component
    }
  };  

  const updateMeeting = async (id: number, updates: Partial<Meeting>) => {
    try {
      await invoke('update_recording', { id, updates });
      setMeetings(prevMeetings =>
        prevMeetings.map(meeting =>
          meeting.id === id ? { ...meeting, ...updates } : meeting
        )
      );
    } catch (error) {
      console.error('Failed to update meeting:', error);
      throw error;
    }
  };

  return (
    <GlobalContext.Provider value={{ user, defaultSettings, loading, setUser, updateDefaultSettings, updateMeeting }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);