'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Banknote,
  CreditCard,
  Smartphone,
  HelpCircle,
  User,
  Building2,
  AlertCircle,
} from 'lucide-react'
import { aprobarCorteAction, rechazarCorteAction } from '@/app/actions/cortes'

type Corte = {
  id: string
  fechaCorte: string
  tipoDia: string
  estado: string
  totalADispersar: string | null
  notasJoana: string | null
  aprobadoPor: string | null
  notasAprobador: string | null
}

type PagoCorte = {
  id: string
  ventaId: string
  montoPagadoCliente: string
  porcentajePagado: string
  montoADispersar: string
  ventaNombreCliente: string | null
  ventaMonto: string | null
  ventaLote: string | null
  desarrolloNombre: string | null
}

type Dispersion = {
  id: string
  liderId: string | null
  beneficiarioNombre: string
  tipoBeneficiario: string
  montoTotal: string
  metodoPago: string | null
  estado: string
  acumulaMensual: boolean
  liderNombre: string | null
  liderMetodoPago: string | null
}

const METODO_CONFIG = {
  EFECTIVO: { label: 'Efectivo', icon: <Banknote className="h-4 w-4" />, color: 'text-green-500' },
  DEPOSITO: { label: 'Depósito', icon: <CreditCard className="h-4 w-4" />, color: 'text-blue-500' },
  TRANSFERENCIA: {
    label: 'Transferencia',
    icon: <Smartphone className="h-4 w-4" />,
    color: 'text-violet-500',
  },
  OTRO: { label: 'Otro', icon: <HelpCircle className="h-4 w-4" />, color: 'text-muted-foreground' },
} as const

const TIPO_LABELS: Record<string, string> = {
  OP_BMCORP: 'Op. BM Corp',
  OP_YESYUCAN: 'Op. Yesyucan',
  ASESOR: 'Asesor',
  LIDER_SALDO: 'Líder (Afiliación)',
  SOCIO_BOLSA_JORGE: 'Socio bolsa Jorge',
  SOCIO_BOLSA_KASS: 'Socio bolsa Kass',
  SOCIO_BOLSA_DIANA: 'Socio bolsa Diana',
  SOCIO_FIJO_JORGE: 'Socio fijo Jorge',
  SOCIO_FIJO_KASS: 'Socio fijo Kass',
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

type MetodoPago = 'EFECTIVO' | 'DEPOSITO' | 'TRANSFERENCIA' | 'OTRO'

export default function CorteAprobacionView({
  empresaId,
  corte,
  pagos,
  dispersiones,
  userRole,
}: {
  empresaId: string
  corte: Corte
  pagos: PagoCorte[]
  dispersiones: Dispersion[]
  userRole: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notas, setNotas] = useState('')
  const [notasRechazo, setNotasRechazo] = useState('')
  const [showRechazo, setShowRechazo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esEnRevision = corte.estado === 'EN_REVISION'
  const esAprobado = corte.estado === 'APROBADO'

  // Método de pago = fijo en el perfil del líder (lideresAlianza.metodoPago).
  // Ya copiado a la dispersión al aprobar; en revisión se previsualiza desde el perfil.
  const metodoDe = (d: Dispersion): MetodoPago =>
    (d.metodoPago ?? d.liderMetodoPago ?? 'EFECTIVO') as MetodoPago

  // Agrupar líderes para mostrar su método (solo lectura)
  const lideres = Array.from(
    new Map(
      dispersiones
        .filter((d) => d.liderId)
        .map((d) => [
          d.liderId!,
          {
            liderId: d.liderId!,
            nombre: d.liderNombre ?? d.beneficiarioNombre,
            metodo: metodoDe(d),
          },
        ]),
    ).values(),
  )

  // Calcular resúmenes de retiro según el método del perfil
  const dispersionesPorMetodo = dispersiones.reduce(
    (acc, d) => {
      const metodo = metodoDe(d)
      if (!acc[metodo]) acc[metodo] = 0
      acc[metodo] += Number(d.montoTotal)
      return acc
    },
    {} as Record<string, number>,
  )

  const totalEfectivo = dispersionesPorMetodo['EFECTIVO'] ?? 0
  const totalDeposito =
    (dispersionesPorMetodo['DEPOSITO'] ?? 0) + (dispersionesPorMetodo['TRANSFERENCIA'] ?? 0)
  const totalADispersar = Number(corte.totalADispersar ?? 0)

  const handleAprobar = () => {
    startTransition(async () => {
      const res = await aprobarCorteAction({
        empresaId,
        corteId: corte.id,
        notas: notas || null,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  const handleRechazar = () => {
    if (!notasRechazo.trim()) {
      setError('Escribe el motivo de rechazo')
      return
    }
    startTransition(async () => {
      const res = await rechazarCorteAction(empresaId, corte.id, notasRechazo)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push(`/empresa/${empresaId}/comisiones/cortes`)
    })
  }

  return (
    <section className="3xl:p-12 w-full space-y-6 p-3 sm:p-6 xl:p-10">
      {/* Back + Header */}
      <div>
        <Link
          href={`/empresa/${empresaId}/comisiones/cortes/${corte.id}`}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Detalle del corte
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-foreground text-xl font-bold">
              {esAprobado ? 'Corte Aprobado' : 'Aprobar Corte de Dispersión'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {corte.tipoDia === 'LUNES' ? 'Lunes' : 'Jueves'} ·{' '}
              {new Date(corte.fechaCorte + 'T12:00:00').toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          {esAprobado && (
            <span className="bg-success/15 text-success inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" /> Aprobado
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Notas de Joana */}
      {corte.notasJoana && (
        <div className="bg-card flex items-start gap-3 rounded-xl border p-4">
          <AlertCircle className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-foreground text-sm font-medium">Nota de Joana</p>
            <p className="text-muted-foreground mt-0.5 text-sm">{corte.notasJoana}</p>
          </div>
        </div>
      )}

      {/* Resumen de retiro — lo más importante */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ResumenCard
          label="💵 Efectivo a retirar"
          value={fmt(totalEfectivo)}
          desc="Joana retira y entrega a Mihbah"
          accent="success"
        />
        <ResumenCard
          label="🏦 A depositar / transferir"
          value={fmt(totalDeposito)}
          desc="Depósito directo a cuenta del lider"
          accent="primary"
        />
        <ResumenCard
          label="Total del corte"
          value={fmt(totalADispersar)}
          desc={`${dispersiones.length} dispersiones`}
        />
      </div>

      {/* Ventas incluidas */}
      <div>
        <h2 className="text-foreground mb-3 font-semibold">Ventas incluidas</h2>
        <div className="space-y-2">
          {pagos.map((pago) => (
            <div key={pago.id} className="bg-card flex items-center gap-4 rounded-xl border p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <span className="text-foreground font-medium">
                    {pago.ventaNombreCliente ?? '—'}
                  </span>
                </div>
                {(pago.desarrolloNombre || pago.ventaLote) && (
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                    <Building2 className="h-3.5 w-3.5" />
                    {pago.desarrolloNombre} · Lote {pago.ventaLote}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-foreground text-sm font-semibold">
                  {fmt(Number(pago.montoADispersar))}
                </p>
                <p className="text-muted-foreground text-xs">
                  {Number(pago.porcentajePagado).toFixed(2)}% del monto · Cliente pagó{' '}
                  {fmt(Number(pago.montoPagadoCliente))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desglose por beneficiario */}
      <div>
        <h2 className="text-foreground mb-3 font-semibold">Desglose por beneficiario</h2>
        <div className="bg-card overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                  Beneficiario
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium">
                  Tipo
                </th>
                <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {dispersiones.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="text-foreground px-4 py-3 font-medium">{d.beneficiarioNombre}</td>
                  <td className="text-muted-foreground px-4 py-3 text-xs">
                    {TIPO_LABELS[d.tipoBeneficiario] ?? d.tipoBeneficiario}
                    {d.acumulaMensual && (
                      <span className="text-warning bg-warning/10 ml-1.5 rounded-full px-1.5 py-0.5 text-xs">
                        Acumula
                      </span>
                    )}
                  </td>
                  <td className="text-foreground px-4 py-3 text-right font-semibold tabular-nums">
                    {fmt(Number(d.montoTotal))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Método de pago por lider — solo si está en revisión */}
      {esEnRevision && (
        <>
          {/* Método de pago — solo lectura, viene del perfil del líder */}
          <div className="bg-card rounded-xl border p-5">
            <h2 className="text-foreground mb-1 font-semibold">Método de pago</h2>
            <p className="text-muted-foreground mb-4 text-xs">
              Definido en el perfil de cada líder. Para cambiarlo, edita el líder en{' '}
              <Link
                href={`/empresa/${empresaId}/comisiones/alianzas`}
                className="text-primary underline"
              >
                Alianzas
              </Link>
              .
            </p>
            {lideres.length > 0 ? (
              <div className="space-y-2">
                {lideres.map((lider) => {
                  const cfg = METODO_CONFIG[lider.metodo] ?? METODO_CONFIG.EFECTIVO
                  return (
                    <div
                      key={lider.liderId}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                    >
                      <span className="text-foreground text-sm font-medium">{lider.nombre}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm font-medium ${cfg.color}`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Sin líderes de alianza en este corte (asesores/socios se pagan en efectivo).
              </p>
            )}
          </div>

          {/* Notas del aprobador */}
          <div className="bg-card rounded-xl border p-5">
            <label className="text-muted-foreground mb-2 block text-xs font-medium">
              Notas del aprobador (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="bg-background border-input w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Observaciones para Joana o el equipo..."
            />
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              id="btn-aprobar-corte"
              onClick={handleAprobar}
              disabled={isPending}
              className="bg-success hover:bg-success/90 flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" />
              {isPending ? 'Aprobando...' : `Aprobar corte — ${fmt(totalADispersar)}`}
            </button>
            <button
              id="btn-rechazar-corte"
              onClick={() => setShowRechazo(!showRechazo)}
              className="text-destructive border-destructive/40 hover:bg-destructive/10 flex items-center justify-center gap-2 rounded-xl border px-5 py-3 font-medium transition-colors"
            >
              <XCircle className="h-5 w-5" />
              Rechazar
            </button>
          </div>

          {/* Panel de rechazo */}
          {showRechazo && (
            <div className="bg-destructive/5 border-destructive/20 rounded-xl border p-5">
              <p className="text-destructive mb-2 font-medium">Motivo de rechazo</p>
              <textarea
                value={notasRechazo}
                onChange={(e) => setNotasRechazo(e.target.value)}
                rows={3}
                className="bg-background border-input w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Explica por qué se rechaza este corte..."
              />
              <button
                id="btn-confirmar-rechazo"
                onClick={handleRechazar}
                disabled={isPending}
                className="bg-destructive hover:bg-destructive/90 mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Corte ya aprobado — mostrar resultado */}
      {esAprobado && (
        <div className="bg-success/10 border-success/30 rounded-xl border p-5">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="text-success h-5 w-5" />
            <p className="text-success font-semibold">Corte aprobado y dispersiones autorizadas</p>
          </div>
          {corte.notasAprobador && (
            <p className="text-muted-foreground text-sm">{corte.notasAprobador}</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-background rounded-lg p-3">
              <p className="text-muted-foreground text-xs">Efectivo</p>
              <p className="text-success font-bold">{fmt(totalEfectivo)}</p>
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-muted-foreground text-xs">Depósito / Transferencia</p>
              <p className="text-primary font-bold">{fmt(totalDeposito)}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ResumenCard({
  label,
  value,
  desc,
  accent,
}: {
  label: string
  value: string
  desc: string
  accent?: 'success' | 'primary'
}) {
  const color =
    accent === 'success'
      ? 'text-success'
      : accent === 'primary'
        ? 'text-primary'
        : 'text-foreground'
  return (
    <div className="bg-card rounded-xl border p-5">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{desc}</p>
    </div>
  )
}
