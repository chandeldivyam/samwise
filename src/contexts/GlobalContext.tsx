// .\src\contexts\GlobalContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useNavigate } from 'react-router-dom';
import { User, DefaultSettings, GlobalContextType, Meeting, Setting } from '../types/global'

const GlobalContext = createContext<GlobalContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  updateMeeting: async () => {},
  appSettings: null,
  updateSettings: async () => {},
});

interface GlobalProviderProps {
  children: React.ReactNode;
}

export const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<Setting[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const fetched_settings: Setting[] = await invoke('get_all_settings', { userId: user.id });
        console.log(fetched_settings)
        setAppSettings(fetched_settings);
      }
      else {
        setLoading(false);
        navigate('/signup');
      }
    };

    fetchUserData();
  }, [navigate]);

  const updateSettings = async (newSettings: Setting[]) => {
    try {
      if (!user) throw new Error("User not found");

      for (const setting of newSettings) {
        const existingSetting = appSettings.find(s => s.setting_type === setting.setting_type);
        if (existingSetting) {
          console.log("new setting", setting)
          await invoke('update_setting', {
            setting: {
              setting_type: setting.setting_type,
              value: setting.value,
              user_id: user.id,
              title: setting.title,
            },
          });
        }
        else {
          await invoke('create_setting', {
            setting: {
              setting_type: setting.setting_type,
              value: setting.value,
              user_id: user.id,
              title: setting.title,
            }
          })
        }
        // Update it in the state
        setAppSettings(prevSettings =>
          prevSettings.map(s =>
            s.id === setting.id ? { ...s, value: setting.value } : s
          )
        );
      }

    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  } 

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
    <GlobalContext.Provider value={{ user, loading, setUser, updateMeeting, appSettings, updateSettings }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);