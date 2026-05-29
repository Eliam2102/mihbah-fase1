'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { crearIncidenciaAction, actualizarEstadoIncidenciaAction } from '@/app/actions/incidencias'
import { CheckCircle2, Clock, AlertCircle, XCircle, Plus, X } from 'lucide-react'

type EstadoIncidencia = 'ABIERTA' | 'EN_PROCESO' | 'RESUELTA' | 'CERRADA'

interface Incidencia {
  id: string
  titulo: string
  descripcion: string
  estado: EstadoIncidencia
  creadoPorNombre: string
  resolucion: string | null
  createdAt: Date
  updatedAt: Date
}

const ESTADO_ICON: Record<EstadoIncidencia, React.ReactNode> = {
  ABIERTA: <AlertCircle className="h-4 w-4 text-rose-500" />,
  EN_PROCESO: <Clock className="h-4 w-4 text-amber-500" />,
  RESUELTA: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  CERRADA: <XCircle className="text-muted-foreground h-4 w-4" />,
}

const ESTADO_PILL: Record<EstadoIncidencia, string> = {
  ABIERTA: 'bg-rose-100 text-rose-700',
  EN_PROCESO: 'bg-amber-100 text-amber-700',
  RESUELTA: 'bg-emerald-100 text-emerald-700',
  CERRADA: 'bg-muted text-muted-foreground',
}

export function IncidenciasView({
  incidencias,
  canManage,
  estadoLabel,
}: {
  incidencias: Incidencia[]
  canManage: boolean
  estadoLabel: Record<string, string>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [gestionando, setGestionando] = useState<string | null>(null)
  const [resolucion, setResolucion] = useState('')
  const [nuevoEstado, setNuevoEstado] = useState<EstadoIncidencia>('EN_PROCESO')

  const abiertas = incidencias.filter((i) => i.estado === 'ABIERTA' || i.estado === 'EN_PROCESO')
  const cerradas = incidencias.filter((i) => i.estado === 'RESUELTA' || i.estado === 'CERRADA')

  const crear = () => {
    startTransition(async () => {
      const res = await crearIncidenciaAction({ titulo, descripcion })
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Incidencia registrada')
        setShowForm(false)
        setTitulo('')
        setDescripcion('')
        router.refresh()
      }
    })
  }

  const gestionar = (id: string) => {
    startTransition(async () => {
      const res = await actualizarEstadoIncidenciaAction(id, nuevoEstado, resolucion || undefined)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Incidencia actualizada')
        setGestionando(null)
        setResolucion('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Botón nueva incidencia */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Nueva incidencia
        </button>
      ) : (
        <div className="bg-card rounded-xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-foreground text-sm font-semibold">Nueva incidencia</h2>
            <button type="button" onClick={() => setShowForm(false)}>
              <X className="text-muted-foreground h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Título breve (mín. 5 caracteres)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="bg-background border-border w-full rounded-md border px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Descripción detallada (mín. 10 caracteres)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="bg-background border-border w-full rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={pending || titulo.length < 5 || descripcion.length < 10}
              onClick={crear}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {pending ? 'Registrando...' : 'Registrar incidencia'}
            </button>
          </div>
        </div>
      )}

      {/* Abiertas */}
      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-foreground text-sm font-semibold">
            Abiertas / En proceso ({abiertas.length})
          </h2>
        </div>
        {abiertas.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">
            Sin incidencias abiertas.
          </p>
        ) : (
          <div className="divide-y">
            {abiertas.map((inc) => (
              <div key={inc.id} className="p-4">
                <div className="flex items-start gap-3">
                  {ESTADO_ICON[inc.estado]}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-foreground text-sm font-medium">{inc.titulo}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_PILL[inc.estado]}`}
                      >
                        {estadoLabel[inc.estado]}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-1 text-xs">{inc.descripcion}</p>
                    <p className="text-muted-foreground text-[10px]">
                      Por {inc.creadoPorNombre} ·{' '}
                      {new Date(inc.createdAt).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setGestionando(gestionando === inc.id ? null : inc.id)}
                      className="hover:bg-muted shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium"
                    >
                      Gestionar
                    </button>
                  )}
                </div>

                {gestionando === inc.id && (
                  <div className="bg-muted/40 mt-3 space-y-2 rounded-lg p-3">
                    <select
                      value={nuevoEstado}
                      onChange={(e) => setNuevoEstado(e.target.value as EstadoIncidencia)}
                      className="bg-background border-border w-full rounded-md border px-3 py-1.5 text-sm"
                    >
                      <option value="EN_PROCESO">En proceso</option>
                      <option value="RESUELTA">Resuelta</option>
                      <option value="CERRADA">Cerrada</option>
                    </select>
                    <textarea
                      placeholder="Notas de resolución (opcional)"
                      value={resolucion}
                      onChange={(e) => setResolucion(e.target.value)}
                      rows={2}
                      className="bg-background border-border w-full rounded-md border px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => gestionar(inc.id)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      {pending ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resueltas */}
      {cerradas.length > 0 && (
        <div className="bg-card overflow-hidden rounded-xl border opacity-70">
          <div className="border-b px-4 py-3">
            <h2 className="text-muted-foreground text-sm font-semibold">
              Resueltas / Cerradas ({cerradas.length})
            </h2>
          </div>
          <div className="divide-y">
            {cerradas.map((inc) => (
              <div key={inc.id} className="flex items-start gap-3 p-4">
                {ESTADO_ICON[inc.estado]}
                <div>
                  <p className="text-foreground text-sm font-medium">{inc.titulo}</p>
                  {inc.resolucion && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Resolución: {inc.resolucion}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    Por {inc.creadoPorNombre} ·{' '}
                    {new Date(inc.createdAt).toLocaleDateString('es-MX')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
