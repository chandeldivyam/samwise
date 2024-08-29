import React, { useState, useRef, useEffect, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ModifyState } from '~/lib/utils'
import { Segment, asSrt } from '~/lib/transcript'
import { invoke } from '@tauri-apps/api/core'
import { usePreferenceProvider } from '~/providers/Preference'
import { useFilesContext } from '~/providers/FilesProvider'
import { getDbManager } from '~/lib/database' 
import ReactMarkdown from 'react-markdown'
import { ErrorModalContext } from '~/providers/ErrorModal'

interface SummaryProps {
  summary: string
  loading: boolean
  setSummary: ModifyState<string>
  segments: Segment[] | null
  summaryPrompt: string
  setSummaryPrompt: ModifyState<string>
}

const Summary: React.FC<SummaryProps> = ({ summary, loading, setSummary, segments, summaryPrompt, setSummaryPrompt }) => {
  const { t } = useTranslation()
  const preference = usePreferenceProvider()
  const { files } = useFilesContext()
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editableSummary, setEditableSummary] = useState(summary)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const { setState: setErrorModal } = useContext(ErrorModalContext)

  setSummaryPrompt(summaryPrompt || defaultSummaryPrompt)

  useEffect(() => {
    setEditableSummary(summary)
  }, [summary])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    setSummary(editableSummary)
    setIsEditing(false)
    if (files.length === 1) {
      const dbManager = getDbManager();
      await dbManager.update('recording_insights',
        { summary: editableSummary, summary_prompt: summaryPrompt },
        'file_name = :fileName',
        { fileName: files[0].name }
      );
    }
  }

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.style.height = 'auto'
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`
    }
  }, [isEditing, editableSummary])

  const handleCancel = () => {
    setEditableSummary(summary)
    setIsEditing(false)
  }

  const generateSummaryPrompt = (summaryInstructions: string, segments: Segment[] = []) => {
    let userMessage = summaryInstructions + "\n\n";
    if (segments.length) {
      userMessage += asSrt(segments, t('common.speaker-prefix'))
    }
    return [
      {
        "role": "user",
        "content": userMessage
      }
    ]
  }

  const handleGenerateSummary = async () => {
    if (!segments || segments.length === 0) {
      alert(t('common.no-transcript-available'))
      return
    }

    setGeneratingSummary(true)

    try {
      const messages = generateSummaryPrompt(summaryPrompt, segments)
      const options = {
        ollama_base_url: preference.chatModelOptions.ollama_base_url,
        ollama_model: preference.chatModelOptions.ollama_model,
        google_api_key: preference.chatModelOptions.gemini_api_key,
		gemini_model: preference.chatModelOptions.gemini_model,
        max_output_tokens: 4096,
      }

      const result = await invoke<string>('process_chat_message', {
        options,
        messages,
        strategyStr: preference.chatModelOptions.strategy,
      })
	  setSummary(result)
	  console.log(files)
	  if (files.length === 1) {
		const dbManager = getDbManager();
		await dbManager.update('recording_insights',
			{ summary: result, summary_prompt: summaryPrompt },
			'file_name = :fileName',
			{ fileName: files[0].name }
		  );
	  }
    } catch (error) {
      setErrorModal({'open': true, 'log': String(error)})
    } finally {
      setGeneratingSummary(false)
    }
  }

  return (
    <div className="w-full h-full bg-base-200 p-4 rounded-lg flex flex-col">
      <h2 className="text-2xl font-bold mb-4">{t('common.summary')}</h2>
      
      <div className="mb-4">
        <label htmlFor="summaryPrompt" className="block text-sm font-medium mb-2">
          {t('common.summary-prompt')}
        </label>
        <textarea
          id="summaryPrompt"
          value={summaryPrompt}
          onChange={(e) => setSummaryPrompt(e.target.value)}
          className="w-full h-24 p-2 border rounded"
        />
      </div>

      <button
        onClick={handleGenerateSummary}
        disabled={generatingSummary || loading}
        className="btn btn-primary mb-4"
      >
        {generatingSummary ? t('common.generating') : t('common.generate-summary')}
      </button>

      {loading || generatingSummary ? (
        <div className="flex justify-center items-center flex-grow">
          <span className="loading loading-dots loading-lg"></span>
        </div>
      ) : (
        <div className="flex-grow overflow-auto">
          {isEditing ? (
            <div className="h-full flex flex-col">
              <textarea
                ref={editTextareaRef}
                value={editableSummary}
                onChange={(e) => setEditableSummary(e.target.value)}
                className="w-full p-2 border rounded resize-none"
                style={{ minHeight: '300px' }}
              />
              <div className="flex justify-end mt-4 space-x-2">
                <button onClick={handleCancel} className="btn btn-secondary">
                  {t('common.cancel')}
                </button>
                <button onClick={handleSave} className="btn btn-primary">
                  {t('common.save')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="prose max-w-none">
                <ReactMarkdown>{summary || t('common.no-summary-available')}</ReactMarkdown>
              </div>
              <button onClick={handleEdit} className="btn btn-secondary mt-4">
                {t('common.edit')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const defaultSummaryPrompt = `Please analyze the meeting transcript and provide a structured summary with the following elements:

1. Overall meeting structure:
   - Start and end times
   - Total duration
   - Number of main topics discussed

2. Detailed topic-wise breakdown:
   - For each main topic:
     a. Topic title or brief description
     b. Start and end timestamps
     c. Duration of discussion
     d. Key points discussed (2-3 bullet points)
     e. Participants who contributed significantly to this topic

3. Information clusters:
   - Group related subtopics or recurring themes
   - Provide a brief description for each cluster
   - List the timestamps where these clusters were discussed

4. Action items and decisions:
   - List any clear action items or decisions made
   - Include associated timestamps and responsible parties (if mentioned)

5. Timeline overview:
   - Create a brief timeline of the meeting, showing how topics flowed from one to another

Please organize the summary in a clear, easy-to-read in as MARKDOWN format.`

export default Summary
