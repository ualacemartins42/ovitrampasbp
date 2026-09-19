import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import App from './App.tsx'
import './index.css'

function PwaRegistrar() {
  useRegisterSW({
    immediate: true,
  })
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PwaRegistrar />
    <App />
    <Toaster richColors position="top-center" />
  </StrictMode>,
)
