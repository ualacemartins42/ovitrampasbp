import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type LayoutMode = 'desktop' | 'mobile'

const STORAGE_KEY = 'layoutMode'

type LayoutContextValue = {
  layoutMode: LayoutMode
  isDesktop: boolean
  setLayoutMode: (mode: LayoutMode) => void
  toggleLayoutMode: () => void
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

function readStoredMode(): LayoutMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'desktop' || raw === 'mobile') return raw
  } catch {
    /* private mode / blocked storage */
  }
  return null
}

function persistMode(mode: LayoutMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(() => readStoredMode() ?? 'mobile')

  function setLayoutMode(mode: LayoutMode) {
    setLayoutModeState(mode)
    persistMode(mode)
  }

  function toggleLayoutMode() {
    setLayoutMode(layoutMode === 'desktop' ? 'mobile' : 'desktop')
  }

  useEffect(() => {
    document.documentElement.dataset.layoutMode = layoutMode
  }, [layoutMode])

  return (
    <LayoutContext.Provider
      value={{
        layoutMode,
        isDesktop: layoutMode === 'desktop',
        setLayoutMode,
        toggleLayoutMode,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayoutMode(): LayoutContextValue {
  const ctx = useContext(LayoutContext)
  if (!ctx) {
    throw new Error('useLayoutMode must be used within LayoutProvider')
  }
  return ctx
}
