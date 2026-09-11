import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

function RedirectHandler() {
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    )

    const redirect = params.get('redirect')

    if (!redirect) {
      return
    }

    const decodedPath =
      decodeURIComponent(redirect)

    window.history.replaceState(
      null,
      '',
      `/microread${decodedPath}`
    )
  }, [])

  return <App />
}

createRoot(
  document.getElementById('root')!
).render(
  <StrictMode>
    <ErrorBoundary>
      <RedirectHandler />
    </ErrorBoundary>
  </StrictMode>
)