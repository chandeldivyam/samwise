export interface User {
    id: number;
    created_at: string;
    name: string;
  }
  
export interface DefaultSettings {
    name: string;
    recordingDirectory: string;
    autoProcess: boolean;
}

export interface GlobalContextType {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    updateMeeting: (id: number, updates: Partial<Meeting>) => Promise<void>;
    appSettings: Setting[] | null;
    updateSettings: (newSettings: Setting[]) => Promise<void>;
}

export interface Meeting {
    id: number;
    name: string;
    transcription?: string;
    summary?: string;
    action_items?: string;
    status: 'Recording' | 'Processing' | 'Processing_completed' | 'Transcribing' | 'Completed';
    created_at: string;
    file_path: string;
}

export interface Setting {
    id?: number;
    user_id: number;
    setting_type: string;
    value: string;
    title?: string;
}

export interface SettingItem {
    id: string;
    type: string;
    title: string;
    description: string;
    value: boolean | string;
    showInSettings: boolean;
    mandatory: boolean;
}