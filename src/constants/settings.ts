import { Setting, SettingItem } from "../types/global";
import { videoDir } from '@tauri-apps/api/path';

export const generateDefaultSettings = async (username: string, user_id: number): Promise<Setting> => {
    const videoDirPath: string = await videoDir();
    const defaultSettings: SettingItem[] = [
        {
          id: "name",
          type: "string",
          title: "Name",
          description: "What would you like me to call you?",
          value: username,
          showInSettings: true,
          mandatory: true,
        },
        {
          id: "recordingDirectory",
          type: "string",
          title: "Recording Directory",
          description: "Where do you want to save the files?",
          value: videoDirPath,
          showInSettings: true,
          mandatory: true,
        },
        {
          id: "autoProcess",
          type: "boolean",
          title: "Auto Process Recordings",
          description: "Do you want to automatically transcribe and generate insights?",
          value: false,
          showInSettings: false,
          mandatory: true,
        },
      ];
    return {
        user_id,
        setting_type: 'default',
        value: JSON.stringify(defaultSettings),
        title: "Default Settings"
    }
}