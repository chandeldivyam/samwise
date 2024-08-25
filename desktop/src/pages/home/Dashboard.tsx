// In Dashboard.tsx

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDbManager } from '~/lib/database'

export interface Recording {
  id: number
  name: string
  file_path: string
  status: string
  created_at: string
}

interface DashboardProps {
  onRecordingClick: (recording: Recording) => void
}

export default function Dashboard({ onRecordingClick }: DashboardProps) {
  const { t } = useTranslation()
  const [recordings, setRecordings] = useState<Recording[]>([])

  useEffect(() => {
    loadRecordings()
  }, [])

  async function loadRecordings() {
    const dbManager = getDbManager()
    const result = await dbManager.select<Recording>('SELECT * FROM recording ORDER BY created_at DESC')
    setRecordings(result)
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
				<td>{recording.name}</td>
				<td>{recording.status}</td>
				<td>{new Date(recording.created_at).toLocaleString()}</td>
				<td>
				  <button
					className="btn btn-sm btn-primary"
					onClick={() => onRecordingClick(recording)}
				  >
					{t('common.dashboard-view')}
				  </button>
				</td>
			  </tr>
			))}
		  </tbody>
		</table>
	  </div>
	</div>
  );
}
