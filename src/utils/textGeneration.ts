import { GoogleGenerativeAI } from "@google/generative-ai";
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
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-pro-exp-0801",
        });
        const generationConfig = {
            temperature: 1,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: maxOutputTokens,
        };
    
        const chatSession = model.startChat({
            generationConfig,
            history,
        });
        
        const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
        return result.response.text();
    } catch (error) {
        showMessage(`Error in generating text: ${error}`, "error");
        return "";
    }
}