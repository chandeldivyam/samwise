// In Dashboard.tsx

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDbManager } from '~/lib/database'
import { FiEdit2, FiCheck, FiX } from 'react-icons/fi'  // Make sure to install react-icons if not already installed

export interface Recording {
  id: number
  name: string
  file_path: string
  status: string
  created_at: string
  pretty_name: string
}

interface DashboardProps {
  onRecordingClick: (recording: Recording) => void
  onRenameRecording: (id: number, newName: string) => Promise<void>
}

export default function Dashboard({ onRecordingClick, onRenameRecording }: DashboardProps) {
  const { t } = useTranslation()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newName, setNewName] = useState<string>('')

  useEffect(() => {
    loadRecordings()
  }, [])

  async function loadRecordings() {
    const dbManager = getDbManager()
    const result = await dbManager.select<Recording>('SELECT * FROM recording ORDER BY created_at DESC')
    setRecordings(result)
  }

  const handleRename = async (id: number) => {
    await onRenameRecording(id, newName)
    setEditingId(null)
    loadRecordings()
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">{t('common.dashboard-title')}</h2>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>{t('common.dashboard-name')}</th>
              <th>{t('common.dashboard-status')}</th>
              <th>{t('common.dashboard-createdAt')}</th>
              <th>{t('common.dashboard-actions')}</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((recording) => (
              <tr key={recording.id}>
                <td>
                  {editingId === recording.id ? (
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="input input-bordered input-sm"
                    />
                  ) : (
                    recording.pretty_name
                  )}
                </td>
                <td>{recording.status}</td>
                <td>{new Date(recording.created_at).toLocaleString()}</td>
                <td>
                  {editingId === recording.id ? (
                    <>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleRename(recording.id)}
                      >
                        <FiCheck />
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <FiX />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setEditingId(recording.id)
                          setNewName(recording.pretty_name)
                        }}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="btn btn-sm btn-primary ml-2"
                        onClick={() => onRecordingClick(recording)}
                      >
                        {t('common.dashboard-view')}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
