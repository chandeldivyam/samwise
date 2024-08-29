import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AsyncApp from './AsyncApp'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<BrowserRouter>
		<AsyncApp />
	</BrowserRouter>
)
