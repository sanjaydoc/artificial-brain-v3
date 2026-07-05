import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import Workspace from '@/pages/Workspace'
import Growth from '@/pages/Growth'
import Reports from '@/pages/Reports'
import Chat from '@/pages/Chat'

export default function App() {
  return (
    <BrowserRouter basename="/businesses">
      <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/growth" element={<Growth />} />
          <Route path="/growth/:id" element={<Growth />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
