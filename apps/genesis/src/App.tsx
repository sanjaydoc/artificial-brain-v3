import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import ProjectPicker from '@/pages/ProjectPicker'
import Canvas from '@/pages/Canvas'
import Runtime from '@/pages/Runtime'
import AgentDetail from '@/pages/AgentDetail'
import AuditTrail from '@/pages/AuditTrail'
import Approvals from '@/pages/Approvals'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <BrowserRouter basename="/genesis">
      <Routes>
        <Route path="/" element={<ProjectPicker />} />
        <Route path="/canvas/:projectId" element={<Canvas />} />
        <Route path="/runtime" element={<Runtime />} />
        <Route path="/runtime/:agentId" element={<AgentDetail />} />
        <Route path="/audit" element={<AuditTrail />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
