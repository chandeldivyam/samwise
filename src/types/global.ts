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
    defaultSettings: DefaultSettings | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    updateDefaultSettings: (newSettings: DefaultSettings) => Promise<void>;
    updateMeeting: (id: number, updates: Partial<Meeting>) => Promise<void>;
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