import { resolveResource } from  '@tauri-apps/api/path'
import { readBinaryFile } from  '@tauri-apps/api/fs'

export const playStartSound = async () => {
    try {
      const soundPath = await resolveResource('assets/start_beep.mp3');
      const audioData = await readBinaryFile(soundPath);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
};