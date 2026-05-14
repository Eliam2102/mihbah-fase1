import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PeriodStore {
  anio: number
  setAnio: (anio: number) => void
}

export const usePeriodStore = create<PeriodStore>()(
  persist(
    (set) => ({
      anio: new Date().getFullYear(),
      setAnio: (anio) => set({ anio }),
    }),
    { name: 'sig-jade-period' },
  ),
)
