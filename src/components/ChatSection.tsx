// ChatSection.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, TextField, Button, Typography, IconButton,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import { GeminiChatHistory } from '../types/global';
import { generateText } from '../utils/textGeneration';
import { useGlobalContext } from '../contexts/GlobalContext';
import ReactMarkdown from 'react-markdown';
import { GENERATE_CHAT_CONTEXT } from '../constants/prompts';

interface ChatSectionProps {
  transcript: string;
  summary: string;
  chatHistory: GeminiChatHistory[];
  onChatHistoryUpdate: (newHistory: GeminiChatHistory[]) => Promise<void>;
}

const ChatSection: React.FC<ChatSectionProps> = ({
  transcript, summary, chatHistory, onChatHistoryUpdate
}) => {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contextMessage, setContextMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { appSettings, showMessage } = useGlobalContext();

  useEffect(() => {
    scrollToBottom();
    if (chatHistory.length === 0) {
      initializeChat();
    }
  }, [chatHistory]);

  const initializeChat = async () => {
    const initialContext = GENERATE_CHAT_CONTEXT(transcript, summary);

    setContextMessage(initialContext);
    // We don't add this to the visible chat history anymore
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (input.trim() === '') return;

    const newHistory: GeminiChatHistory[] = [
      ...chatHistory,
      { role: 'user', parts: [{ text: input }] },
    ];
    await onChatHistoryUpdate(newHistory);
    setInput('');
    setIsGenerating(true);

    try {
      const fullHistory: GeminiChatHistory[] = [
        { role: 'user', parts: [{ text: contextMessage }] },
        ...newHistory
      ];
      console.log(fullHistory)
      const response = await generateText(fullHistory, 4096, appSettings, showMessage);
      const updatedHistory: GeminiChatHistory[] = [...newHistory, { role: 'model', parts: [{ text: response }] }];
      await onChatHistoryUpdate(updatedHistory);
    } catch (error) {
      console.error('Error generating response:', error);
      showMessage('Failed to generate response', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (index: number) => {
    const newHistory = chatHistory.filter((_, i) => i !== index);
    await onChatHistoryUpdate(newHistory);
  };

  const handleContextSave = () => {
    setIsSettingsOpen(false);
    // Optionally, you can update the context in the parent component or store it
  };

  return (
    <Box display="flex" flexDirection="column" height="calc(50vh)">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Chat</Typography>
        <IconButton onClick={() => setIsSettingsOpen(true)}>
          <SettingsIcon />
        </IconButton>
      </Box>
      <List sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
        {chatHistory.map((msg, index) => (
          <ListItem key={index} alignItems="flex-start">
            <ListItemText
              primary={msg.role === 'user' ? 'You' : 'Assistant'}
              secondary={
                <ReactMarkdown>
                  {msg.parts[0].text}
                </ReactMarkdown>
              }
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(index)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        <div ref={chatEndRef} />
      </List>
      <Box display="flex" alignItems="center">
        <TextField
          fullWidth
          variant="outlined"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isGenerating}
        />
        <Button
          variant="contained"
          color="primary"
          endIcon={<SendIcon />}
          onClick={handleSend}
          disabled={isGenerating}
          sx={{ ml: 1 }}
        >
          Send
        </Button>
      </Box>
      {isGenerating && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Generating response...
        </Typography>
      )}

      <Dialog open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>System Instructions</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={contextMessage}
            onChange={(e) => setContextMessage(e.target.value)}
            placeholder="Enter the context message for the chat"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
          <Button onClick={handleContextSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatSection;