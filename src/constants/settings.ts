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
          secret: false,
        },
        {
          id: "recordingDirectory",
          type: "string",
          title: "Recording Directory",
          description: "Where do you want to save the files?",
          value: videoDirPath,
          showInSettings: true,
          mandatory: true,
          secret: false,
        },
        {
          id: "autoProcess",
          type: "boolean",
          title: "Auto Process Recordings",
          description: "Do you want to automatically transcribe and generate insights?",
          value: false,
          showInSettings: false,
          mandatory: true,
          secret: false,
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
        secret: false,
      },
      {
        id: "deepgramApiKey",
        type: "string",
        title: "Deepgram API key",
        description: "Deepgram provide $200 free credits which would last for 700 hours of recordings",
        value: "",
        showInSettings: true,
        mandatory: false,
        secret: true,
      },
      {
        id: "groqApiKey",
        type: "string",
        title: "Groq API key",
        description: "Groq is free till a certain limit. Max file size is 25mb",
        value: "",
        showInSettings: true,
        mandatory: false,
        secret: true,
      }
    ];
    return {
        user_id: user_id,
        setting_type: 'transcription',
        value: JSON.stringify(transcriptionSettings),
        title: "Transcription Settings"
    };
}

export const generateTextGenerationSettings = async (user_id: number): Promise<Setting> => {
  const transcriptionSettings: SettingItem[] = [
    {
      id: "useCloudTextGeneration",
      type: "boolean",
      title: "Use Cloud Text Generation",
      description: "Using cloud providers like groq and geminia for text generation and thoughts",
      value: true,
      showInSettings: true,
      mandatory: true,
      secret: false,
    },
    {
      id: "geminiApiKey",
      type: "string",
      title: "Google Gemini API key",
      description: "Gemini provides free models and its API key could be obtained from https://aistudio.google.com/",
      value: "",
      showInSettings: true,
      mandatory: false,
      secret: true,
    }
  ];

  return {
      user_id,
      setting_type: "text_generation",
      value: JSON.stringify(transcriptionSettings),
      title: "Text Generation Settings"
  };
}