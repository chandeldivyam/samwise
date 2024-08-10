import { invoke } from '@tauri-apps/api/tauri';
import { generateDefaultSettings, generateTranscriptionSettings } from '../constants/settings';

export const generateAppSettings = async(username: string, user_id: number): Promise<void> => {
    const settingsToUpdate = []

    // Create Default Settings
    const defaultSettings = await generateDefaultSettings(username, user_id);
    settingsToUpdate.push(defaultSettings)

    // Create Transcription Settings
    const transcriptionSettings = await generateTranscriptionSettings(user_id);
    settingsToUpdate.push(transcriptionSettings)

    // Storing this information to the database
    for (const setting of settingsToUpdate) {
        await storeToDb(setting)
    }
    
    return;
}

const storeToDb = async(setting: any) => {
    try {
        await invoke('create_setting', {
            setting
        })
        return true;
    } catch (error) {
        console.log("Error in stroing to db", error)
        throw new Error();
    }
}