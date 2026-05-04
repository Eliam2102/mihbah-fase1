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
      setEmpresaActiva: (id) => set({ empresaActiva: id }),
    }),
    {
      name: 'mihbah-empresa-activa',
    },
  ),
)
