import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedLayout, StaffOutlet } from '@/components/layout/ProtectedLayout'
import { AppProviders } from '@/features/auth/AuthProvider'
import { CollectionFormPage } from '@/pages/CollectionFormPage'
import { CollectionsListPage } from '@/pages/CollectionsListPage'
import { HomePage } from '@/pages/HomePage'
import { LabPanelPage } from '@/pages/LabPanelPage'
import { LoginPage } from '@/pages/LoginPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SyncPage } from '@/pages/SyncPage'

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/coletas" element={<CollectionsListPage />} />
            <Route path="/coletas/nova" element={<CollectionFormPage />} />
            <Route path="/sincronizar" element={<SyncPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route element={<StaffOutlet />}>
              <Route path="/laboratorio" element={<LabPanelPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProviders>
  )
}
