import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EmpresaId = 'TODAS' | (string & {})

interface EmpresaStore {
  empresaActiva: EmpresaId
  setEmpresaActiva: (id: EmpresaId) => void
}

export const useEmpresaStore = create<EmpresaStore>()(
  persist(
    (set) => ({
      empresaActiva: 'TODAS',
      setEmpresaActiva: (id) => {
        set({ empresaActiva: id })
        if (typeof window !== 'undefined') {
          document.cookie = `mihbah-empresa-activa=${id}; path=/; max-age=31536000; SameSite=Lax`
        }
      },
    }),
    {
      name: 'mihbah-empresa-activa',
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          document.cookie = `mihbah-empresa-activa=${state.empresaActiva}; path=/; max-age=31536000; SameSite=Lax`
        }
      },
    },
  ),
)
