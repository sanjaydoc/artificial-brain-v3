import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Sync dark mode from parent app's localStorage
const savedTheme = localStorage.getItem('brain_theme')
const prefersDark = savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.classList.toggle('dark', prefersDark)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
