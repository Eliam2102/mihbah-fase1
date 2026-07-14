import { create } from 'zustand'

interface SyncStatus {
  fecha: string | null
  stale: boolean
  empresaId: string
}

interface SyncStatusStore {
  status: SyncStatus | null
  setStatus: (s: SyncStatus | null) => void
}

export const useSyncStatusStore = create<SyncStatusStore>()((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}))
