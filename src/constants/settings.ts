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
    };
}

export const generateTranscriptionSettings = async (user_id: number): Promise<Setting> => {
    const transcriptionSettings: SettingItem[] = [
      {
        id: "useCloudTranscription",
        type: "boolean",
        title: "Use Cloud Transcription",
        description: "Using cloud providers like groq and deepgram for speech to text transcription",
        value: true,
        showInSettings: true,
        mandatory: true,
      },
      {
        id: "deepgramApiKey",
        type: "string",
        title: "Deepgram API key",
        description: "Deepgram provide $200 free credits which would last for 700 hours of recordings",
        value: "",
        showInSettings: true,
        mandatory: false,
      },
      {
        id: "deepgramApiKey",
        type: "string",
        title: "Deepgram API key",
        description: "Deepgram provide $200 free credits which would last for 700 hours of recordings",
        value: "",
        showInSettings: true,
        mandatory: false,
      }
    ];
    return {
        user_id: user_id,
        setting_type: 'transcription',
        value: JSON.stringify(transcriptionSettings),
        title: "Transcription Settings"
    };
}