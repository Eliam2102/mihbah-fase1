'use client'

import { useState } from 'react'
import { Plus, Search, Network } from 'lucide-react'
import type { Afiliado, Lider, Asesor } from '@/lib/services/comisiones/alianzas.service'
import type { Matriz } from '@/lib/services/comisiones/esquemas.service'
import { AlianzaCardRail } from './alianza-card-rail'
import { AlianzaPanel } from './alianza-panel'
import { AlianzaForm } from './alianza-form'

export interface AlianzaConRelaciones {
  afiliado: Afiliado
  lideres: Lider[]
  asesores: Asesor[]
  matrizTerreno: Matriz | null
  matrizAccion: Matriz | null
}

export function AlianzasView({
  empresaId,
  alianzas,
}: {
  empresaId: string
  alianzas: AlianzaConRelaciones[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(alianzas[0]?.afiliado.id ?? null)
  const [filtro, setFiltro] = useState('')
  const [creating, setCreating] = useState(false)
  const [showPanelMobile, setShowPanelMobile] = useState(false)

  const q = filtro.toLowerCase().trim()
  const filtradas = q
    ? alianzas.filter(
        (a) =>
          a.afiliado.nombre.toLowerCase().includes(q) ||
          (a.afiliado.mondayLabel?.toLowerCase().includes(q) ?? false) ||
          a.lideres.some((l) => l.nombre.toLowerCase().includes(q)) ||
          a.asesores.some((s) => s.nombre.toLowerCase().includes(q)),
      )
    : alianzas

  const selected = alianzas.find((a) => a.afiliado.id === selectedId) ?? null

  function handleSelect(id: string) {
    setSelectedId(id)
    setShowPanelMobile(true)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      {/* RAIL */}
      <aside
        className={`bg-card overflow-hidden rounded-xl border shadow-sm ${
          showPanelMobile ? 'hidden lg:block' : 'block'
        }`}
      >
        <div className="border-b p-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Buscar alianza, líder o asesor..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="bg-background border-input focus:border-ring focus:ring-ring/20 w-full rounded-md border py-1.5 pr-2.5 pl-8 text-xs focus:ring-2 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            disabled={creating}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            Nueva alianza
          </button>
          <p className="text-muted-foreground mt-2 text-[11px]">
            {filtradas.length} de {alianzas.length} alianzas
          </p>
        </div>

        <div className="max-h-[calc(100vh-280px)] space-y-2 overflow-y-auto p-3">
          {creating && (
            <AlianzaForm
              empresaId={empresaId}
              variant="inline"
              onDone={() => setCreating(false)}
              onCancel={() => setCreating(false)}
            />
          )}

          {filtradas.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-xs">Sin coincidencias.</p>
          ) : (
            filtradas.map((a) => (
              <AlianzaCardRail
                key={a.afiliado.id}
                alianza={a}
                selected={a.afiliado.id === selectedId}
                onClick={() => handleSelect(a.afiliado.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* PANEL */}
      <section className={`${showPanelMobile ? 'block' : 'hidden lg:block'}`}>
        {selected ? (
          <AlianzaPanel
            empresaId={empresaId}
            alianza={selected}
            onBack={() => setShowPanelMobile(false)}
          />
        ) : (
          <div className="bg-card flex flex-col items-center justify-center gap-3 rounded-xl border p-12 text-center shadow-sm">
            <div className="text-muted-foreground bg-muted/40 grid h-16 w-16 place-items-center rounded-full">
              <Network className="h-7 w-7 opacity-50" />
            </div>
            <p className="text-foreground text-sm font-semibold">Selecciona una alianza</p>
            <p className="text-muted-foreground max-w-xs text-xs">
              Elige una alianza del panel izquierdo para ver y administrar sus líderes, asesores y
              matrices.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
