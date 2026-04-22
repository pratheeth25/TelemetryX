import { useEffect } from 'react'
import { useSocket } from './hooks/useSocket'
import useStore from './store/useStore'
import Dashboard from './components/Dashboard'

export default function App() {
  const darkMode = useStore((s) => s.darkMode)

  // Boot the single socket connection for the whole app
  useSocket()

  // Keep the <html> class in sync with store (handles initial load too)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return <Dashboard />
}
