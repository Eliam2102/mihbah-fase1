'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { crearIncidenciaPortalAction } from '@/app/actions/incidencias'
import { AlertCircle, CheckCircle2, Clock, XCircle, Plus, X } from 'lucide-react'

type EstadoIncidencia = 'ABIERTA' | 'EN_PROCESO' | 'RESUELTA' | 'CERRADA'

interface Incidencia {
  id: string
  titulo: string
  descripcion: string
  estado: EstadoIncidencia
  resolucion: string | null
  createdAt: Date
}

const ESTADO_ICON: Record<EstadoIncidencia, React.ReactNode> = {
  ABIERTA: <AlertCircle className="h-4 w-4 text-rose-500" />,
  EN_PROCESO: <Clock className="h-4 w-4 text-amber-500" />,
  RESUELTA: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  CERRADA: <XCircle className="text-muted-foreground h-4 w-4" />,
}

const ESTADO_LABEL: Record<EstadoIncidencia, string> = {
  ABIERTA: 'Abierta',
  EN_PROCESO: 'En proceso',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
}

export function IncidenciasPortalView({ incidencias }: { incidencias: Incidencia[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const crear = () => {
    startTransition(async () => {
      const res = await crearIncidenciaPortalAction({ titulo, descripcion })
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Incidencia registrada. El equipo la revisará pronto.')
        setShowForm(false)
        setTitulo('')
        setDescripcion('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
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
              placeholder="¿Cuál es el problema? (resumen breve)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="bg-background border-border w-full rounded-md border px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Describe el problema con detalle..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="bg-background border-border w-full rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={pending || titulo.length < 5 || descripcion.length < 10}
              onClick={crear}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {pending ? 'Enviando...' : 'Enviar incidencia'}
            </button>
          </div>
        </div>
      )}

      {incidencias.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Sin incidencias registradas.
        </p>
      ) : (
        <div className="bg-card divide-y overflow-hidden rounded-xl border">
          {incidencias.map((inc) => (
            <div key={inc.id} className="flex items-start gap-3 p-4">
              {ESTADO_ICON[inc.estado]}
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-foreground text-sm font-medium">{inc.titulo}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {ESTADO_LABEL[inc.estado]}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">{inc.descripcion}</p>
                {inc.resolucion && (
                  <p className="mt-1 text-xs text-emerald-600">Resolución: {inc.resolucion}</p>
                )}
                <p className="text-muted-foreground mt-1 text-[10px]">
                  {new Date(inc.createdAt).toLocaleDateString('es-MX')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
