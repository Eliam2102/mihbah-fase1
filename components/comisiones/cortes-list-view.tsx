'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Scissors,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Calendar,
  Banknote,
} from 'lucide-react'
import { crearCorteAction } from '@/app/actions/cortes'

type Corte = {
  id: string
  fechaCorte: string
  tipoDia: string
  estado: string
  totalADispersar: string | null
  notasJoana: string | null
  creadoPor: string
  aprobadoPor: string | null
  fechaAprobacion: Date | null
  createdAt: Date
}

const ESTADO_CONFIG = {
  BORRADOR: {
    label: 'Borrador',
    icon: <Clock className="h-3.5 w-3.5" />,
    className: 'bg-muted text-muted-foreground',
    ring: 'border-border',
  },
  EN_REVISION: {
    label: 'En revisión',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    className: 'bg-warning/15 text-warning',
    ring: 'border-warning/40',
  },
  APROBADO: {
    label: 'Aprobado',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: 'bg-success/15 text-success',
    ring: 'border-success/40',
  },
  RECHAZADO: {
    label: 'Rechazado',
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: 'bg-destructive/15 text-destructive',
    ring: 'border-destructive/40',
  },
} as const

const DIA_CONFIG = {
  LUNES: { label: 'Lunes', color: 'text-blue-500' },
  JUEVES: { label: 'Jueves', color: 'text-violet-500' },
} as const

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const formatFecha = (iso: string) => {
  const parts = iso.split('-')
  const y = Number(parts[0])
  const m = Number(parts[1]) - 1
  const d = Number(parts[2])
  return new Date(y, m, d).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function CortesListView({
  empresaId,
  cortes,
  userRole,
}: {
  empresaId: string
  cortes: Corte[]
  userRole: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    fechaCorte: '',
    tipoDia: 'LUNES' as 'LUNES' | 'JUEVES',
    notasJoana: '',
  })
  const [error, setError] = useState<string | null>(null)

  // Sugerir próximos días
  const hoy = new Date()
  const diasHastaLunes = (8 - hoy.getDay()) % 7 || 7
  const diasHastaJueves = (4 - hoy.getDay() + 7) % 7 || 7
  const proximoLunes = new Date(hoy)
  proximoLunes.setDate(hoy.getDate() + (hoy.getDay() === 1 ? 0 : diasHastaLunes))
  const proximoJueves = new Date(hoy)
  proximoJueves.setDate(hoy.getDate() + (hoy.getDay() === 4 ? 0 : diasHastaJueves))
  const toISO = (d: Date): string => d.toISOString().split('T')[0] ?? ''

  const handleCrear = () => {
    setError(null)
    if (!form.fechaCorte) {
      setError('Selecciona una fecha para el corte')
      return
    }
    startTransition(async () => {
      const res = await crearCorteAction({
        empresaId,
        fechaCorte: form.fechaCorte,
        tipoDia: form.tipoDia,
        notasJoana: form.notasJoana || null,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push(`/empresa/${empresaId}/comisiones/cortes/${res.data.corteId}`)
    })
  }

  const borradores = cortes.filter((c) => c.estado === 'BORRADOR')
  const enRevision = cortes.filter((c) => c.estado === 'EN_REVISION')
  const aprobados = cortes.filter((c) => c.estado === 'APROBADO')
  const rechazados = cortes.filter((c) => c.estado === 'RECHAZADO')

  return (
    <section className="3xl:p-12 w-full space-y-6 p-3 sm:p-6 xl:p-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Scissors className="text-primary h-5 w-5" />
            <h1 className="text-foreground text-xl font-bold">Cortes de Dispersión</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Lunes y jueves · Joana registra pagos → Jorge/Carla aprueban → Portal notifica
          </p>
        </div>
        <button
          id="btn-crear-corte"
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo corte
        </button>
      </div>

      {/* Formulario crear corte */}
      {showForm && (
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <h2 className="text-foreground mb-4 font-semibold">Crear nuevo corte</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Sugerencias rápidas */}
            <div className="sm:col-span-2">
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                Días sugeridos
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, fechaCorte: toISO(proximoLunes), tipoDia: 'LUNES' }))
                  }
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    form.fechaCorte === toISO(proximoLunes)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Calendar className="mx-auto mb-1 h-4 w-4 text-blue-500" />
                  Lunes{' '}
                  {proximoLunes.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, fechaCorte: toISO(proximoJueves), tipoDia: 'JUEVES' }))
                  }
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    form.fechaCorte === toISO(proximoJueves)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Calendar className="mx-auto mb-1 h-4 w-4 text-violet-500" />
                  Jueves{' '}
                  {proximoJueves.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </button>
              </div>
            </div>

            {/* Fecha manual */}
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                Fecha del corte
              </label>
              <input
                type="date"
                value={form.fechaCorte}
                onChange={(e) => setForm((f) => ({ ...f, fechaCorte: e.target.value }))}
                className="bg-background border-input w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            {/* Día */}
            <div>
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                Tipo de día
              </label>
              <select
                value={form.tipoDia}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipoDia: e.target.value as 'LUNES' | 'JUEVES' }))
                }
                className="bg-background border-input w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="LUNES">Lunes</option>
                <option value="JUEVES">Jueves</option>
              </select>
            </div>

            {/* Notas */}
            <div className="sm:col-span-2">
              <label className="text-muted-foreground mb-1.5 block text-xs font-medium">
                Notas (opcional)
              </label>
              <textarea
                value={form.notasJoana}
                onChange={(e) => setForm((f) => ({ ...f, notasJoana: e.target.value }))}
                rows={2}
                className="bg-background border-input w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Observaciones del corte..."
              />
            </div>
          </div>

          {error && <p className="text-destructive mt-3 text-sm">{error}</p>}

          <div className="mt-4 flex gap-3">
            <button
              id="btn-crear-corte-submit"
              onClick={handleCrear}
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isPending ? 'Creando...' : 'Crear corte'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-muted text-muted-foreground hover:bg-muted/70 rounded-lg px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Cortes en revisión — prominente */}
      {enRevision.length > 0 && (
        <div>
          <p className="text-warning mb-2 text-xs font-semibold uppercase">
            ⏳ Pendientes de aprobación
          </p>
          <div className="space-y-2">
            {enRevision.map((corte) => (
              <CorteCard key={corte.id} corte={corte} empresaId={empresaId} />
            ))}
          </div>
        </div>
      )}

      {/* Borradores */}
      {borradores.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">Borradores</p>
          <div className="space-y-2">
            {borradores.map((corte) => (
              <CorteCard key={corte.id} corte={corte} empresaId={empresaId} />
            ))}
          </div>
        </div>
      )}

      {/* Aprobados */}
      {aprobados.length > 0 && (
        <div>
          <p className="text-success mb-2 text-xs font-semibold uppercase">✅ Aprobados</p>
          <div className="space-y-2">
            {aprobados.map((corte) => (
              <CorteCard key={corte.id} corte={corte} empresaId={empresaId} />
            ))}
          </div>
        </div>
      )}

      {/* Rechazados */}
      {rechazados.length > 0 && (
        <div>
          <p className="text-destructive mb-2 text-xs font-semibold uppercase">Rechazados</p>
          <div className="space-y-2">
            {rechazados.map((corte) => (
              <CorteCard key={corte.id} corte={corte} empresaId={empresaId} />
            ))}
          </div>
        </div>
      )}

      {/* Vacío */}
      {cortes.length === 0 && !showForm && (
        <div className="bg-muted/30 rounded-xl border border-dashed px-6 py-12 text-center">
          <Scissors className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
          <p className="text-foreground font-medium">Sin cortes registrados</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Crea tu primer corte de dispersión para el próximo lunes o jueves.
          </p>
        </div>
      )}
    </section>
  )
}

function CorteCard({ corte, empresaId }: { corte: Corte; empresaId: string }) {
  const estadoCfg =
    ESTADO_CONFIG[corte.estado as keyof typeof ESTADO_CONFIG] ?? ESTADO_CONFIG.BORRADOR
  const diaCfg = DIA_CONFIG[corte.tipoDia as keyof typeof DIA_CONFIG] ?? DIA_CONFIG.LUNES
  const fmt2 = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

  return (
    <Link
      href={`/empresa/${empresaId}/comisiones/cortes/${corte.id}`}
      className={`bg-card hover:bg-muted/20 flex items-center gap-4 rounded-xl border p-4 transition-colors ${estadoCfg.ring}`}
    >
      {/* Ícono día */}
      <div className="bg-muted shrink-0 rounded-lg p-2.5">
        <Calendar className={`h-5 w-5 ${diaCfg.color}`} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${diaCfg.color}`}>{diaCfg.label}</span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-foreground text-sm font-medium">
            {formatFecha(corte.fechaCorte)}
          </span>
        </div>
        {corte.notasJoana && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">{corte.notasJoana}</p>
        )}
      </div>

      {/* Monto */}
      {corte.totalADispersar && Number(corte.totalADispersar) > 0 && (
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-1">
            <Banknote className="text-success h-4 w-4" />
            <span className="text-success text-sm font-semibold tabular-nums">
              {fmt2(Number(corte.totalADispersar))}
            </span>
          </div>
        </div>
      )}

      {/* Estado badge */}
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${estadoCfg.className}`}
      >
        {estadoCfg.icon}
        {estadoCfg.label}
      </span>

      <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
    </Link>
  )
}
