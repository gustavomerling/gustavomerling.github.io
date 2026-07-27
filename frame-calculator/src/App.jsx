import { useState, useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import FrameCalculator from './components/FrameCalculator'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const savedSession = localStorage.getItem('isLoggedIn')
    if (savedSession) {
      setIsLoggedIn(true)
    }
  }, [])

  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true')
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    setIsLoggedIn(false)
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return <FrameCalculator onLogout={handleLogout} />
}

export default App
