import { invoke } from "@tauri-apps/api/tauri";
import { Setting, SettingItem, GeminiChatHistory } from "../types/global";
import { get } from "lodash";

export async function generateText(
  history: GeminiChatHistory[],
  maxOutputTokens: number,
  appSettings: Setting[] | null,
  showMessage: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void
): Promise<string> {
    const textGenerationSettings: Setting[] | undefined = appSettings?.filter(setting => setting.setting_type === 'text_generation');
    if (!textGenerationSettings || !textGenerationSettings[0].value || typeof(textGenerationSettings[0].value) !== 'string') {
        showMessage("Unable to get text generation settings, please set it up from the settings section", "error");
        return "";
    }
    const allSettings: SettingItem[] = JSON.parse(textGenerationSettings[0].value);
    const geminiSettings = allSettings.filter(item => item.id === 'geminiApiKey');
    const apiKey = get(geminiSettings, "[0].value");
    if (!apiKey || typeof(apiKey) !== 'string') {
        showMessage("Gemini API Key not found", "error");
        return "";
    }

    try {
        const result = await invoke<string>("generate_text", {
            history: history,
            maxOutputTokens: maxOutputTokens,
            apiKey: apiKey
        });
        return result;
    } catch (error) {
        showMessage(`Error in generating text: ${error}`, "error");
        return "";
    }
}