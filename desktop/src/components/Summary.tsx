import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ModifyState } from '~/lib/utils'
import { Segment, asSrt } from '~/lib/transcript'
import { invoke } from '@tauri-apps/api/core'
import { usePreferenceProvider } from '~/providers/Preference'
import { useFilesContext } from '~/providers/FilesProvider'
import { getDbManager } from '~/lib/database' 
import ReactMarkdown from 'react-markdown'

interface SummaryProps {
  summary: string
  loading: boolean
  setSummary: ModifyState<string>
  segments: Segment[] | null
}

const Summary: React.FC<SummaryProps> = ({ summary, loading, setSummary, segments }) => {
  const { t } = useTranslation()
  const preference = usePreferenceProvider()
  const { files } = useFilesContext()
  const [summaryPrompt, setSummaryPrompt] = useState(defaultSummaryPrompt)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editableSummary, setEditableSummary] = useState(summary)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

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
        { summary: editableSummary },
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
        max_output_tokens: 1024,
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
			{ summary: result },
			'file_name = :fileName',
			{ fileName: files[0].name }
		  );
	  }
    } catch (error) {
      console.error('Error generating summary:', error)
      alert(t('common.summary-generation-error'))
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

const defaultSummaryPrompt = `You are an expert executive assistant tasked with creating a detailed, informative summary of a meeting transcript. Your goal is to extract key insights and relevant information so that people don't need to listen to the recording. Please analyze the provided transcript and create a summary that includes:

- Meeting Overview:
   - Main topic or purpose of the meeting
   - Key participants (if identifiable)

- Meeting Timeline:
    - Main topics discussed and oneliner about them

- Key Points and Decisions:
   - List the most important points discussed
   - Highlight any decisions made
   - Note any significant agreements or disagreements

- Action Items and Next Steps:
   - Extract any tasks, assignments, or follow-up actions
   - Include responsible parties and deadlines if mentioned

- Project Updates (if applicable):
   - Summarize current status of any projects discussed
   - Note any challenges, progress, or changes in direction

- Important Details:
   - Include any critical numbers, dates, or facts mentioned
   - Highlight any strategic insights or unique ideas presented

- Questions and Open Issues:
   - List any unanswered questions or topics requiring further discussion

- Overall Summary:
   - Provide a detailed, low-level summary of the meeting's outcome and significance

Guidelines:
- The speaker diarization is not proper. So use your intelligence about who could be whom.
- If the transcript is short or generic, focus only on relevant points. 
- If there's little of substance, state "This meeting contained minimal actionable or strategic content."
- Aim for clarity and conciseness.
- Use bullet points and clear headings for easy scanning.
- If technical terms are used, provide brief explanations if necessary for context.
- Maintain a professional, neutral tone throughout the summary.
- Use only MARKDOWN format for the response
- DO NOT MISS Factual information under any circumstance. This is very important, try to mention all the proper nouns and facts mentioned.
- Following the above mentioned strucutre is not necessary. Think for youself and figure out how can you add value to the user

Based on the transcript provided, generate a meeting summary following these guidelines.`

export default Summary
