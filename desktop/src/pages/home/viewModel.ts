import '@fontsource/roboto'
import { event, path } from '@tauri-apps/api'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import * as webview from '@tauri-apps/api/webviewWindow'
import * as dialog from '@tauri-apps/plugin-dialog'
import * as fs from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-shell'
import { useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import successSound from '~/assets/success.mp3'
import { TextFormat } from '~/components/FormatSelect'
import { AudioDevice } from '~/lib/audio'
import * as config from '~/lib/config'
import * as transcript from '~/lib/transcript'
import { NamedPath, ls, openPath, pathToNamedPath } from '~/lib/utils'
import { getDbManager } from '~/lib/database' 
import { getX86Features } from '~/lib/x86Features'
import { ErrorModalContext } from '~/providers/ErrorModal'
import { useFilesContext } from '~/providers/FilesProvider'
import { ModelOptions, usePreferenceProvider } from '~/providers/Preference'
import { UpdaterContext } from '~/providers/Updater'
import { Recording } from './Dashboard'
import { Message } from '~/components/Chat'
import { useAnalytics } from '~/providers/Analytics';

export interface BatchOptions {
	files: NamedPath[]
	format: TextFormat
	modelOptions: ModelOptions
}

export function viewModel() {
	const location = useLocation()
	const [settingsVisible, setSettingsVisible] = useState(location.hash === '#settings')
	const navigate = useNavigate()
	const [loading, setLoading] = useState(false)
	const [isRecording, setIsRecording] = useState(false)
	const abortRef = useRef<boolean>(false)
	const [isAborting, setIsAborting] = useState(false)
	const [segments, setSegments] = useState<transcript.Segment[] | null>(null)
	const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
	const [progress, setProgress] = useState<number | null>(0)

	const { files, setFiles } = useFilesContext()
	const [tabIndex, setTabIndex] = useState(0)
	const preference = usePreferenceProvider()
	const [devices, setDevices] = useState<AudioDevice[]>([])
	const [inputDevice, setInputDevice] = useState<AudioDevice | null>(null)
	const [outputDevice, setOutputDevice] = useState<AudioDevice | null>(null)
	const [summary, setSummary] = useState<string>('')
	const [summaryPrompt, setSummaryPrompt] = useState<string>('')
	const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'chat'>('transcript')
	const [messages, setMessages] = useState<Message[]>([]);

	const { updateApp, availableUpdate } = useContext(UpdaterContext)
	const { setState: setErrorModal } = useContext(ErrorModalContext)

	const { capture } = useAnalytics();

	async function onFilesChanged() {
		if (files.length === 1) {
			setAudio(new Audio(convertFileSrc(files[0].path)))
		}
	}
	useEffect(() => {
		onFilesChanged()
	}, [files])

	async function handleNewSegment() {
		await listen('transcribe_progress', (event) => {
			const value = event.payload as number
			if (value >= 0 && value <= 100) {
				setProgress(value)
			}
		})
		await listen<transcript.Segment>('new_segment', (event) => {
			const { payload } = event
			setSegments((prev) => {
				if (!prev) return [payload]
				
				// Check if the new segment is a duplicate
				const isDuplicate = prev.some(segment => 
					segment.start === payload.start &&
					segment.stop === payload.stop &&
					segment.text === payload.text &&
					segment.speaker === payload.speaker
				)
				
				// Only add the new segment if it's not a duplicate
				return isDuplicate ? prev : [...prev, payload]
			})
		})
	}

	async function handleRecordFinish() {
		await listen<{ path: string; name: string }>('record_finish', (event) => {
			const { name, path } = event.payload
			setTabIndex(0)
			setFiles([{ name, path }])
			setIsRecording(false)
			const dbManager = getDbManager();
			dbManager.insert('recording', {
				file_name: name,
				file_path: path,
				pretty_name: name,
				status: 'RECORDING_COMPLETED',
				name: name,
			});
		})
	}

	async function loadAudioDevices() {
		let newDevices = await invoke<AudioDevice[]>('get_audio_devices')
		const defaultInput = newDevices.find((d) => d.isDefault && d.isInput)
		const defaultOutput = newDevices.find((d) => d.isDefault && !d.isInput)
		if (defaultInput) {
			setInputDevice(defaultInput)
		}
		if (defaultOutput) {
			setOutputDevice(defaultOutput)
		}
		setDevices(newDevices)
	}

	async function onAbort() {
		setIsAborting(true)
		abortRef.current = true
		event.emit('abort_transcribe')
	}

	async function selectFiles() {
		const selected = await dialog.open({
			multiple: true,
			filters: [
				{
					name: 'Audio or Video files',
					extensions: [...config.audioExtensions, ...config.videoExtensions],
				},
			],
		})
		if (selected) {
			const newFiles: NamedPath[] = []
			const dbManager = getDbManager()
			for (const file of selected) {
				newFiles.push({ name: file.name ?? '', path: file.path })

				// We need to check if the filepath already exists in file_path in db
				const existingRecordings = await dbManager.select<{id: number, name: string, transcription: string}>(
					`SELECT r.id, r.name, ri.transcription 
					 FROM recording r
					 LEFT JOIN recording_insights ri ON r.file_name = ri.file_name
					 WHERE r.file_path = :filePath`,
					{ filePath: file.path }
				)

				if(Array.isArray(existingRecordings) && existingRecordings.length > 0 && existingRecordings[0].transcription) {
					try{	
						if (existingRecordings[0].transcription) setSegments(JSON.parse(existingRecordings[0].transcription))
					}
					catch{
						continue;
					}
				}
				else {
					dbManager.insert('recording', {
						file_name: file.name ?? '',
						file_path: file.path,
						status: 'RECORDING_COMPLETED',
						name: file.name,
						pretty_name: file.name,
					});
				}
			}
			setFiles(newFiles)

			if (newFiles.length > 1) {
				navigate('/batch', { state: { files: newFiles } })
			}
		}
	}

	async function checkModelExists() {
		try {
			const configPath = await invoke<string>('get_models_folder')
			const entries = await ls(configPath)
			const filtered = entries.filter((e) => e.name?.endsWith('.bin'))
			if (filtered.length === 0) {
				// Download new model if no models and it's not manual installation
				if (!preference.skippedSetup) {
					navigate('/setup')
				}
			} else {
				if (!preference.modelPath || !(await fs.exists(preference.modelPath))) {
					// if model path not found set another one as default
					const absPath = await path.join(configPath, filtered[0].name)
					preference.setModelPath(absPath)
				}
			}
		} catch (e) {
			console.error(e)
			navigate('/setup')
		}
	}

	async function handleDrop() {
		listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
			const newFiles: NamedPath[] = []
			for (const path of event.payload.paths) {
				const file = await pathToNamedPath(path)
				newFiles.push({ name: file.name, path: file.path })
			}
			setFiles(newFiles)
			if (newFiles.length > 1) {
				navigate('/batch', { state: { files: newFiles } })
			}
		})
	}

	async function CheckCpuAndInit() {
		const features = await getX86Features()
		if (features) {
			const unsupported = Object.entries(features || {})
				.filter(([_, feature]) => feature.enabled && !feature.support)
				.map(([name]) => name)
			if (unsupported.length > 0) {
				// Found unsupported features
				await dialog.message(
					`Your CPU is old and doesn't support some features (${unsupported.join(
						','
					)}). Please click OK and read the readme that will open for more information.`,
					{
						kind: 'error',
					}
				)
				open(config.unsupportedCpuReadmeURL)
				return // Don't run anything
			}
		}

		handleDrop()
		checkModelExists()
		handleNewSegment()
		handleRecordFinish()
		loadAudioDevices()
	}

	useEffect(() => {
		CheckCpuAndInit()
	}, [])

	async function startRecord() {
		setSegments(null)
		setIsRecording(true)
		let devices: AudioDevice[] = []
		if (inputDevice) {
			devices.push(inputDevice)
		}
		if (outputDevice) {
			devices.push(outputDevice)
		}
		invoke('start_record', { devices, storeInDocuments: preference.storeRecordInDocuments })
	}

	async function stopRecord() {
		emit('stop_record')
	}

	async function transcribe() {
		setSegments(null)
		setLoading(true)
		abortRef.current = false
		let res: transcript.Transcript;
		try {
			await invoke('load_model', { modelPath: preference.modelPath, gpuDevice: preference.gpuDevice })
			const options = {
				path: files[0].path,
				...preference.modelOptions,
			}
			const startTime = performance.now()
			const diarizeOptions = { threshold: preference.diarizeThreshold, max_speakers: preference.maxSpeakers, enabled: preference.recognizeSpeakers }
			res = await invoke('transcribe', {
				options,
				modelPath: preference.modelPath,
				diarizeOptions,
			})

			// Calcualte time
			const total = Math.round((performance.now() - startTime) / 1000)
			console.info(`Transcribe took ${total} seconds.`)

			setSegments(res.segments)
			// Store or update transcription in the database
			const dbManager = getDbManager();
			const fileName = files[0].name;
			
			// Check if a recording with this file name already exists
			const existingRecordings = await dbManager.select<{ id: number, status: string }>(
			  'SELECT id, status FROM recording WHERE file_name = :fileName',
			  { fileName }
			);
		
			if (!Array.isArray(existingRecordings) || existingRecordings.length === 0){
				return;
			}
			// Check if insights already exist for this recording
			let recordingId: number = existingRecordings[0].id;
			  await dbManager.update('recording', 
				{ status: 'TRANSCRIPTION_COMPLETED' },
				'id = :id',
				{ id: recordingId }
			  );

			const existingInsights = await dbManager.select<{ id: number }>(
			  'SELECT id FROM recording_insights WHERE file_name = :fileName',
			  { fileName }
			);
		
			const transcriptionText = JSON.stringify(res.segments)
		
			if (existingInsights.length > 0) {
			  // Update existing insights
			  await dbManager.update('recording_insights',
				{ transcription: transcriptionText },
				'file_name = :fileName',
				{ fileName }
			  );
			} else {
			  // Insert new insights
			  await dbManager.insert('recording_insights', {
				file_name: fileName,
				transcription: transcriptionText,
			  });
			}
		} catch (error) {
			if (!abortRef.current) {
				console.error('error: ', error)
				setErrorModal?.({ log: String(error), open: true })
				setLoading(false)
			}
		} finally {
			setLoading(false)
			setIsAborting(false)
			setProgress(null)
			if (!abortRef.current) {
				// Focus back the window and play sound
				if (preference.soundOnFinish) {
					new Audio(successSound).play()
				}
				if (preference.focusOnFinish) {
					webview.getCurrentWebviewWindow().unminimize()
					webview.getCurrentWebviewWindow().setFocus()
				}
			}
		}
	}

	async function handleRecordingClick(recording: Recording) {
		setTabIndex(0)
		setFiles([{ name: recording.name, path: recording.file_path }])
		setAudio(new Audio(convertFileSrc(recording.file_path)))
	
		const dbManager = getDbManager()
		const [insights] = await dbManager.select<{ transcription: string, summary: string, summary_prompt: string }>(
		  'SELECT transcription, summary, summary_prompt FROM recording_insights WHERE file_name = :fileName',
		  { fileName: recording.name }
		)
	
		if (insights && insights.transcription) {
		  setSegments(JSON.parse(insights.transcription))
		  setSummary(insights.summary)
		  if (!insights.summary_prompt) {
			setSummaryPrompt('')
		  } 
		  else {
			setSummaryPrompt(insights.summary_prompt)
		  }
		} else {
		  setSegments(null)
		}
		capture('recording_viewed');
	}

	async function renameRecording(id: number, newName: string) {
		const dbManager = getDbManager()
		await dbManager.update(
		  'recording',
		  { pretty_name: newName },
		  'id = :id',
		  { id }
		)
	}


	return {
		devices,
		setDevices,
		inputDevice,
		setInputDevice,
		outputDevice,
		setOutputDevice,
		isRecording,
		setIsRecording,
		startRecord,
		stopRecord,
		preference: preference,
		openPath,
		selectFiles,
		isAborting,
		settingsVisible,
		setSettingsVisible,
		loading,
		progress,
		audio,
		setAudio,
		files,
		setFiles,
		availableUpdate,
		updateApp,
		segments,
		setSegments,
		transcribe,
		onAbort,
		tabIndex,
		setTabIndex,
		handleRecordingClick,
		summary,
		setSummary,
		summaryPrompt, 
		setSummaryPrompt,
		activeTab,
		setActiveTab,
		messages, 
		setMessages,
		renameRecording,
	}
}
