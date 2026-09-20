import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminOutlet, ProtectedLayout, StaffOutlet } from '@/components/layout/ProtectedLayout'
import { AppProviders } from '@/features/auth/AuthProvider'
import { AgentesPage } from '@/pages/admin/AgentesPage'
import { BairrosPage } from '@/pages/admin/BairrosPage'
import { CollectionFormPage } from '@/pages/CollectionFormPage'
import { CollectionsListPage } from '@/pages/CollectionsListPage'
import { CycleFormPage } from '@/pages/CycleFormPage'
import { CyclesPage } from '@/pages/CyclesPage'
import { HomePage } from '@/pages/HomePage'
import { LabPanelPage } from '@/pages/LabPanelPage'
import { LoginPage } from '@/pages/LoginPage'
import { MapPage } from '@/pages/MapPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RelatoriosPage } from '@/pages/RelatoriosPage'
import { SyncPage } from '@/pages/SyncPage'
import { TrapFormPage } from '@/pages/TrapFormPage'
import { TrapsPage } from '@/pages/TrapsPage'

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/ovitrampas" element={<TrapsPage />} />
            <Route path="/ovitrampas/nova" element={<TrapFormPage />} />
            <Route path="/ovitrampas/:code" element={<TrapFormPage />} />
            <Route path="/ciclos" element={<CyclesPage />} />
            <Route path="/ciclos/novo" element={<CycleFormPage />} />
            <Route path="/ciclos/concluidos" element={<Navigate to="/relatorios" replace />} />
            <Route path="/ciclos/:id" element={<CycleFormPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/mapa" element={<MapPage />} />
            <Route path="/coletas" element={<CollectionsListPage />} />
            <Route path="/coletas/nova" element={<CollectionFormPage />} />
            <Route path="/sincronizar" element={<SyncPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route element={<StaffOutlet />}>
              <Route path="/laboratorio" element={<LabPanelPage />} />
            </Route>
            <Route element={<AdminOutlet />}>
              <Route path="/admin/agentes" element={<AgentesPage />} />
              <Route path="/admin/bairros" element={<BairrosPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  )
}
