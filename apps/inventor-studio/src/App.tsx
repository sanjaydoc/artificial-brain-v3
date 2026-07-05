import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import Dashboard from '@/pages/Dashboard'
import Inventions from '@/pages/Inventions'
import InventionDetail from '@/pages/InventionDetail'
import Chat from '@/pages/Chat'
import Vibe from '@/pages/Vibe'
import Electronics from '@/pages/Electronics'
import CircuitCanvas from '@/pages/CircuitCanvas'
import CircuitPublic from '@/pages/CircuitPublic'
import DreamStream from '@/pages/DreamStream'
import GuestStream from '@/pages/GuestStream'
import ShowcaseView from '@/pages/ShowcaseView'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/inventor-studio">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventions" element={<Inventions />} />
          <Route path="/inventions/:id" element={<InventionDetail />} />
          <Route path="/invention/:id" element={<InventionDetail />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/vibe" element={<Vibe />} />
          <Route path="/vibe/:inventionId" element={<Vibe />} />
          <Route path="/electronics" element={<Electronics />} />
          <Route path="/electronics/:id" element={<CircuitCanvas />} />
          <Route path="/circuits/:id" element={<CircuitPublic />} />
          <Route path="/stream/:id" element={<DreamStream />} />
          <Route path="/dream/:id" element={<DreamStream />} />
          <Route path="/guest-stream/:id" element={<GuestStream />} />
          <Route path="/guest" element={<GuestStream />} />
          <Route path="/showcase/:id" element={<ShowcaseView />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
