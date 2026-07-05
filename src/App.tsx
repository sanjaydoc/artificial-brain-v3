import { BrowserRouter, Route, Routes, Outlet, useLocation } from 'react-router-dom'
import { BrainProvider } from '@/context/BrainContext'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppHeader } from '@/components/AppHeader'
import Home from '@/pages/Home'
import Chat from '@/pages/Chat'
import NeuralMap from '@/pages/NeuralMap'
import Robot from '@/pages/Robot'
import Config from '@/pages/Config'
import Memory from '@/pages/Memory'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Commands from '@/pages/Commands'
import MemoryManagement from '@/pages/MemoryManagement'
import Orchestrator from '@/pages/layers/Orchestrator'
import LayerMemory from '@/pages/layers/LayerMemory'
import LayerTools from '@/pages/layers/LayerTools'
import Identity from '@/pages/layers/Identity'
import Observability from '@/pages/layers/Observability'
import Guardrails from '@/pages/layers/Guardrails'
import Admin from '@/pages/Admin'

// Initialize dark mode from localStorage on app load
;(() => {
  const saved = localStorage.getItem('brain_theme')
  const prefersDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', prefersDark)
})()

function AppLayout() {
  const location = useLocation()
  if (location.pathname === '/') return <Outlet />

  return (
    <>
      <AppHeader />
      <main className="relative z-10 max-w-[1480px] mx-auto px-4 py-3">
        <Outlet />
      </main>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrainProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground antialiased">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route element={<AppLayout />}>
                <Route path="/chat" element={<Chat />} />
                <Route path="/neural" element={<NeuralMap />} />
                <Route path="/robot" element={<Robot />} />
                <Route path="/memory" element={<Memory />} />
                <Route path="/commands" element={<Commands />} />
                <Route path="/memory-mgmt" element={<MemoryManagement />} />
                <Route path="/layer-orchestrator" element={<Orchestrator />} />
                <Route path="/layer-memory" element={<LayerMemory />} />
                <Route path="/layer-tools" element={<LayerTools />} />
                <Route path="/layer-identity" element={<Identity />} />
                <Route path="/layer-observability" element={<Observability />} />
                <Route path="/layer-guardrails" element={<Guardrails />} />
                <Route path="/config" element={<ProtectedRoute adminOnly><Config /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
              </Route>
            </Routes>
          </div>
        </BrowserRouter>
      </BrainProvider>
    </AuthProvider>
  )
}
