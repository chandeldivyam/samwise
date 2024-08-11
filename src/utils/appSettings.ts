import { invoke } from '@tauri-apps/api/tauri';
import { generateDefaultSettings, generateTranscriptionSettings, generateTextGenerationSettings } from '../constants/settings';
import { Setting } from '../types/global';

export const ensureUserSettings = async (username: string, user_id: number): Promise<Setting[]> => {
    const settingTypes = ['default', 'transcription', 'text_generation'];
    let allSettings: Setting[] = await invoke('get_all_settings', { userId: user_id });
    
    for (const settingType of settingTypes) {
        if (!allSettings.some(s => s.setting_type === settingType)) {
            let newSetting: Setting | undefined;
            
            if (settingType === 'default') {
                newSetting = await generateDefaultSettings(username, user_id);
            } else if (settingType === 'transcription') {
                newSetting = await generateTranscriptionSettings(user_id);
            } 
            else if (settingType === 'text_generation') {
                newSetting = await generateTextGenerationSettings(user_id);
            } else {
                console.error(`Unknown setting type: ${settingType}`);
                continue; // Skip to the next iteration if settingType is not recognized
            }
            
            if (newSetting) {
                await storeToDb(newSetting);
                allSettings.push(newSetting);
            }
        }
    }
    
    return allSettings;
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