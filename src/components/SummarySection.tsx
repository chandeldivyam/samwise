import React, { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, Typography, CircularProgress, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { generateText } from '../utils/textGeneration';
import { GeminiChatHistory } from '../types/global';
import { useGlobalContext } from '../contexts/GlobalContext';
import ReactMarkdown from 'react-markdown';
import { GENERATE_MEETING_SUMMARY } from '../constants/prompts';

interface SummarySectionProps {
  transcript: string;
  initialSummary: string;
  onSummaryUpdate: (newSummary: string) => Promise<void>;
}

const SummarySection: React.FC<SummarySectionProps> = ({ transcript, initialSummary, onSummaryUpdate }) => {
  const [summary, setSummary] = useState(initialSummary);
  const [isEditing, setIsEditing] = useState(false);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState(GENERATE_MEETING_SUMMARY);
  const [isGenerating, setIsGenerating] = useState(false);
  const { appSettings, showMessage } = useGlobalContext();

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    try {
      const history: GeminiChatHistory[] = [
        {
          role: "user",
          parts: [{ text: `${prompt}\n\n${transcript}` }]
        }
      ];
      const generatedSummary = await generateText(history, 8192, appSettings, showMessage);
      setSummary(generatedSummary);
      await onSummaryUpdate(generatedSummary);
    } catch (error) { 
      console.error("Error generating summary:", error);
      showMessage(`Error generating summary: ${error}`, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSummary = async () => {
    await onSummaryUpdate(summary);
    setIsEditing(false);
  };

  const handlePromptSave = () => {
    setIsPromptDialogOpen(false);
    // Optionally, save the prompt to some persistent storage
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Meeting Summary</Typography>
        <Box>
          <Button
            variant="contained"
            onClick={handleGenerateSummary}
            disabled={isGenerating}
            sx={{ mr: 1 }}
          >
            {isGenerating ? <CircularProgress size={24} /> : 'Generate'}
          </Button>
          <IconButton onClick={() => setIsPromptDialogOpen(true)} size="small">
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>
      
      {summary ? (
        <Box>
          <Tabs value={isEditing ? 1 : 0} onChange={(_, newValue) => setIsEditing(newValue === 1)}>
            <Tab label="View" />
            <Tab label="Edit" />
          </Tabs>
          {isEditing ? (
            <Box mt={2}>
              <TextField
                fullWidth
                multiline
                rows={10}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
              <Box display="flex" justifyContent="flex-end" mt={1}>
                <Button onClick={() => setIsEditing(false)} sx={{ mr: 1 }}>Cancel</Button>
                <Button variant="contained" onClick={handleSaveSummary}>Save</Button>
              </Box>
            </Box>
          ) : (
            <Box mt={2} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: '4px' }}>
              <ReactMarkdown>{summary}</ReactMarkdown>
            </Box>
          )}
        </Box>
      ) : (
        <Typography color="text.secondary">
          No summary available. Click 'Generate' to create a summary.
        </Typography>
      )}

      <Dialog open={isPromptDialogOpen} onClose={() => setIsPromptDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Prompt</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your instructions for summary generation"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPromptDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePromptSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SummarySection;