'use client'
import NumberInput from '@/components/ui/number-input'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Calculator, X, Link2, FileUp } from 'lucide-react'
import {
  crearBonoConfigAction,
  actualizarBonoConfigAction,
  eliminarBonoConfigAction,
  calcularBonosMesAction,
  actualizarGrupoDesarrolloAction,
  vincularBonoCorteMesAction,
  marcarPagoBonoAction,
} from '@/app/actions/comisiones/bonos-umbral'

type Grupo = 'YCD' | 'ARKA' | 'RH' | 'OTRO'
type Fuente = 'PROPIA' | 'OVERRIDE_AFILIADO'
type Formula = 'EXCEDENTE' | 'TOTAL_GRUPOS_APLICA' | 'EXCEDENTE_CAP_GRUPOS'

const GRUPOS: Grupo[] = ['YCD', 'ARKA', 'RH', 'OTRO']

export interface BonoConfigRow {
  id: string
  nombre: string
  afiliadoDestinatarioId: string
  afiliadoDestinatarioNombre: string
  tipoFuente: Fuente
  afiliadoOrigenId: string | null
  afiliadoOrigenNombre: string | null
  overridePct: number | null
  umbralAcumuladoMensual: number
  bonoPct: number
  gruposAcumulan: Grupo[]
  gruposAplicaBono: Grupo[]
  formulaCalculo: Formula
  activo: boolean
  vigenteDesde: string
  vigenteHasta: string | null
  notas: string | null
}

export interface BonoCalculadoRow {
  id: string
  configId: string
  configNombre: string
  destinatarioNombre: string | null
  anio: number
  mes: number
  ventasYcd: number
  ventasArka: number
  ventasRh: number
  totalAcumulado: number
  excedente: number
  montoOverride: number
  montoBono: number
  montoTotal: number
  corteId: string | null
  pagado: boolean
}

interface CorteBorradorOpt {
  id: string
  fechaCorte: string
  tipoDia: string
}

interface AfiliadoOpt {
  id: string
  nombre: string
}

export interface DesarrolloGrupoRow {
  id: string
  nombre: string
  desarrolladora: string | null
  grupoDesarrolladora: Grupo
}

interface Props {
  empresaId: string
  configs: BonoConfigRow[]
  calculados: BonoCalculadoRow[]
  afiliados: AfiliadoOpt[]
  desarrollos: DesarrolloGrupoRow[]
  cortesBorrador: CorteBorradorOpt[]
  anio: number
  mes: number
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

export function BonosUmbralView({
  empresaId,
  configs,
  calculados,
  afiliados,
  desarrollos,
  cortesBorrador,
  anio,
  mes,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<BonoConfigRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [pending, startTransition] = useTransition()
  const [periodoAnio, setPeriodoAnio] = useState(anio)
  const [periodoMes, setPeriodoMes] = useState(mes)

  const cambiarPeriodo = () => {
    const params = new URLSearchParams()
    params.set('anio', String(periodoAnio))
    params.set('mes', String(periodoMes))
    router.push(`/empresa/${empresaId}/comisiones/bonos?${params.toString()}`)
  }

  const calcular = () => {
    startTransition(async () => {
      const res = await calcularBonosMesAction({ empresaId, anio: periodoAnio, mes: periodoMes })
      if (!res.ok) toast.error(res.error)
      else {
        toast.success(`${res.data.count} bonos calculados`)
        router.refresh()
      }
    })
  }

  const eliminar = (id: string) => {
    if (!confirm('¿Eliminar esta regla de bono?')) return
    startTransition(async () => {
      const res = await eliminarBonoConfigAction(empresaId, id)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Regla eliminada')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Bonos por umbral mensual
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Reglas configurables para Flamingo, Hackers (Diana) y cualquier afiliado con bono al
            cruzar volumen mensual.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Nueva regla
        </button>
      </div>

      {/* Cálculo del mes */}
      <div className="bg-card rounded-xl border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-muted-foreground block text-xs font-medium">Año</label>
            <input
              type="number"
              min={2020}
              max={2100}
              value={periodoAnio}
              onChange={(e) => setPeriodoAnio(Number(e.target.value))}
              className="bg-background mt-1 w-24 rounded-md border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-muted-foreground block text-xs font-medium">Mes</label>
            <select
              value={periodoMes}
              onChange={(e) => setPeriodoMes(Number(e.target.value))}
              className="bg-background mt-1 w-32 rounded-md border px-2 py-1.5 text-sm"
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={cambiarPeriodo}
            className="hover:bg-muted rounded-md border px-3 py-1.5 text-sm"
          >
            Ver período
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={calcular}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Calculator className="h-4 w-4" /> Calcular bonos del mes
          </button>
        </div>
      </div>

      {/* Resultados del mes */}
      <CalculadosSection
        calculados={calculados}
        cortesBorrador={cortesBorrador}
        empresaId={empresaId}
        mes={mes}
        anio={anio}
      />

      {/* Reglas */}
      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-foreground text-sm font-semibold">
            Reglas configuradas ({configs.length})
          </h2>
        </div>
        {configs.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            Sin reglas. Crea una para Flamingo, Diana o cualquier afiliado con acuerdo especial.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Nombre</th>
                  <th className="px-3 py-2 text-left font-medium">Destinatario</th>
                  <th className="px-3 py-2 text-left font-medium">Fuente</th>
                  <th className="px-3 py-2 text-right font-medium">Umbral</th>
                  <th className="px-3 py-2 text-right font-medium">Bono %</th>
                  <th className="px-3 py-2 text-right font-medium">Override %</th>
                  <th className="px-3 py-2 text-left font-medium">Fórmula</th>
                  <th className="px-3 py-2 text-center font-medium">Activa</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {configs.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 font-medium">{c.nombre}</td>
                    <td className="px-3 py-2">{c.afiliadoDestinatarioNombre}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {c.tipoFuente === 'OVERRIDE_AFILIADO'
                        ? `OVR ← ${c.afiliadoOrigenNombre ?? '?'}`
                        : 'PROPIA'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmt(c.umbralAcumuladoMensual)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.bonoPct.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {c.overridePct != null ? `${c.overridePct.toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{c.formulaCalculo}</td>
                    <td className="px-3 py-2 text-center">
                      {c.activo ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                          Sí
                        </span>
                      ) : (
                        <span className="bg-muted rounded-full px-2 py-0.5 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(c)}
                          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(c.id)}
                          className="text-muted-foreground rounded p-1 hover:bg-rose-50 hover:text-rose-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clasificación de desarrollos por grupo (alimenta cálculo) */}
      <DesarrollosGrupoSection empresaId={empresaId} desarrollos={desarrollos} />

      {(creating || editing) && (
        <BonoConfigDialog
          empresaId={empresaId}
          afiliados={afiliados}
          initial={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function BonoConfigDialog({
  empresaId,
  afiliados,
  initial,
  onClose,
  onSaved,
}: {
  empresaId: string
  afiliados: AfiliadoOpt[]
  initial: BonoConfigRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [destinatarioId, setDestinatarioId] = useState(
    initial?.afiliadoDestinatarioId ?? afiliados[0]?.id ?? '',
  )
  const [tipoFuente, setTipoFuente] = useState<Fuente>(initial?.tipoFuente ?? 'PROPIA')
  const [origenId, setOrigenId] = useState<string | null>(initial?.afiliadoOrigenId ?? null)
  const [overridePct, setOverridePct] = useState<string>(
    initial?.overridePct != null ? String(initial.overridePct) : '',
  )
  const [umbral, setUmbral] = useState<string>(
    initial ? String(initial.umbralAcumuladoMensual) : '10000000',
  )
  const [bonoPct, setBonoPct] = useState<string>(initial ? String(initial.bonoPct) : '0.5')
  const [gruposAcumulan, setGruposAcumulan] = useState<Grupo[]>(
    initial?.gruposAcumulan ?? ['YCD', 'ARKA', 'RH'],
  )
  const [gruposAplica, setGruposAplica] = useState<Grupo[]>(
    initial?.gruposAplicaBono ?? ['ARKA', 'RH'],
  )
  const [formula, setFormula] = useState<Formula>(initial?.formulaCalculo ?? 'EXCEDENTE')
  const [activo, setActivo] = useState(initial?.activo ?? true)
  const [vigenteDesde, setVigenteDesde] = useState(
    initial?.vigenteDesde ?? new Date().toISOString().slice(0, 10),
  )
  const [vigenteHasta, setVigenteHasta] = useState<string>(initial?.vigenteHasta ?? '')
  const [notas, setNotas] = useState(initial?.notas ?? '')
  const [pending, startTransition] = useTransition()

  const toggleGrupo = (set: Grupo[], setter: (g: Grupo[]) => void, g: Grupo) => {
    setter(set.includes(g) ? set.filter((x) => x !== g) : [...set, g])
  }

  const submit = () => {
    const payload = {
      empresaId,
      nombre,
      afiliadoDestinatarioId: destinatarioId,
      tipoFuente,
      afiliadoOrigenId: tipoFuente === 'OVERRIDE_AFILIADO' ? origenId : null,
      overridePct:
        tipoFuente === 'OVERRIDE_AFILIADO' && overridePct.trim() ? Number(overridePct) : null,
      umbralAcumuladoMensual: Number(umbral),
      bonoPct: Number(bonoPct),
      gruposAcumulan,
      gruposAplicaBono: gruposAplica,
      formulaCalculo: formula,
      activo,
      vigenteDesde,
      vigenteHasta: vigenteHasta.trim() ? vigenteHasta : null,
      notas: notas.trim() ? notas : null,
    }
    startTransition(async () => {
      const res = initial
        ? await actualizarBonoConfigAction({ ...payload, id: initial.id })
        : await crearBonoConfigAction(payload)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Regla guardada')
        onSaved()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{initial ? 'Editar regla' : 'Nueva regla de bono'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nombre">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Flamingo umbral 10M"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Afiliado destinatario (recibe el bono)">
              <select
                value={destinatarioId}
                onChange={(e) => setDestinatarioId(e.target.value)}
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              >
                {afiliados.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de fuente">
              <select
                value={tipoFuente}
                onChange={(e) => setTipoFuente(e.target.value as Fuente)}
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="PROPIA">Propia (ventas del destinatario)</option>
                <option value="OVERRIDE_AFILIADO">Override (ventas de otro afiliado)</option>
              </select>
            </Field>
          </div>

          {tipoFuente === 'OVERRIDE_AFILIADO' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Afiliado origen (cuyas ventas alimentan)">
                <select
                  value={origenId ?? ''}
                  onChange={(e) => setOrigenId(e.target.value || null)}
                  className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">— elige —</option>
                  {afiliados.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Override % (sobre TODAS las ventas del origen)">
                <input
                  type="number"
                  step="0.01"
                  value={overridePct}
                  onChange={(e) => setOverridePct(e.target.value)}
                  className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="1.00"
                />
              </Field>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Umbral acumulado mensual">
              <input
                type="number"
                step="0.01"
                value={umbral}
                onChange={(e) => setUmbral(e.target.value)}
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Bono % (al cruzar umbral)">
              <input
                type="number"
                step="0.01"
                value={bonoPct}
                onChange={(e) => setBonoPct(e.target.value)}
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="Grupos que SUMAN al acumulado">
            <div className="flex flex-wrap gap-2">
              {GRUPOS.map((g) => (
                <label
                  key={g}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                    gruposAcumulan.includes(g)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={gruposAcumulan.includes(g)}
                    onChange={() => toggleGrupo(gruposAcumulan, setGruposAcumulan, g)}
                  />
                  {g}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Grupos donde APLICA el bono">
            <div className="flex flex-wrap gap-2">
              {GRUPOS.map((g) => (
                <label
                  key={g}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                    gruposAplica.includes(g)
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={gruposAplica.includes(g)}
                    onChange={() => toggleGrupo(gruposAplica, setGruposAplica, g)}
                  />
                  {g}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Fórmula de cálculo del bono">
            <select
              value={formula}
              onChange={(e) => setFormula(e.target.value as Formula)}
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="EXCEDENTE">EXCEDENTE — bono % × (total − umbral)</option>
              <option value="TOTAL_GRUPOS_APLICA">
                TOTAL_GRUPOS_APLICA — bono % × suma(grupos aplica)
              </option>
              <option value="EXCEDENTE_CAP_GRUPOS">
                EXCEDENTE_CAP_GRUPOS — bono % × min(excedente, suma grupos aplica)
              </option>
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vigente desde">
              <input
                type="date"
                value={vigenteDesde}
                onChange={(e) => setVigenteDesde(e.target.value)}
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Vigente hasta (opcional)">
              <input
                type="date"
                value={vigenteHasta}
                onChange={(e) => setVigenteHasta(e.target.value)}
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="Notas (opcional)">
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Regla activa
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-muted flex-1 rounded-md border px-3 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {pending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CalculadosSection({
  calculados,
  cortesBorrador,
  empresaId,
  mes,
  anio,
}: {
  calculados: BonoCalculadoRow[]
  cortesBorrador: CorteBorradorOpt[]
  empresaId: string
  mes: number
  anio: number
}) {
  const router = useRouter()
  const [selectedCortes, setSelectedCortes] = useState<Record<string, string>>({})
  const [modalPago, setModalPago] = useState<BonoCalculadoRow | null>(null)
  const [pending, startTransition] = useTransition()

  const vincular = (bonoId: string) => {
    const corteId = selectedCortes[bonoId]
    if (!corteId) {
      toast.error('Selecciona un corte primero')
      return
    }
    startTransition(async () => {
      const res = await vincularBonoCorteMesAction({ empresaId, bonoId, corteId })
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Bono asignado al corte')
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="border-b px-4 py-3">
        <h2 className="text-foreground text-sm font-semibold">
          Bonos calculados — {MESES[mes - 1]} {anio}
        </h2>
      </div>
      {calculados.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-sm">
          Sin bonos calculados para este período. Da click en &quot;Calcular bonos del mes&quot;.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Regla</th>
                <th className="px-3 py-2 text-left font-medium">Destinatario</th>
                <th className="px-3 py-2 text-right font-medium">Override</th>
                <th className="px-3 py-2 text-right font-medium">Bono</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-left font-medium">Corte</th>
                <th className="px-3 py-2 text-center font-medium">Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {calculados.map((c) => (
                <tr key={c.id} className={c.pagado ? 'opacity-60' : ''}>
                  <td className="px-3 py-2 font-medium">{c.configNombre}</td>
                  <td className="px-3 py-2">{c.destinatarioNombre ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.montoOverride)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(c.montoBono)}</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-700 tabular-nums">
                    {fmt(c.montoTotal)}
                  </td>
                  <td className="px-3 py-2">
                    {c.pagado ? (
                      <span className="bg-jade-100 text-jade-800 rounded-full px-2 py-0.5 text-xs">
                        Pagado
                      </span>
                    ) : c.corteId ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        Asignado
                      </span>
                    ) : cortesBorrador.length === 0 ? (
                      <span className="text-muted-foreground text-xs">Sin cortes borrador</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <select
                          className="bg-background rounded border px-1.5 py-1 text-xs"
                          value={selectedCortes[c.id] ?? ''}
                          onChange={(e) =>
                            setSelectedCortes((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                        >
                          <option value="">— corte —</option>
                          {cortesBorrador.map((ct) => (
                            <option key={ct.id} value={ct.id}>
                              {ct.fechaCorte} {ct.tipoDia}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={pending || !selectedCortes[c.id]}
                          onClick={() => vincular(c.id)}
                          className="text-primary hover:bg-primary/10 rounded p-1 disabled:opacity-40"
                          title="Asignar a corte"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {c.pagado ? (
                      '—'
                    ) : c.corteId ? (
                      <button
                        type="button"
                        onClick={() => setModalPago(c)}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        <FileUp className="h-3 w-3" /> Pagar
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalPago && (
        <PagoBonoModal
          bono={modalPago}
          empresaId={empresaId}
          onClose={() => setModalPago(null)}
          onPaid={() => {
            setModalPago(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function PagoBonoModal({
  bono,
  empresaId,
  onClose,
  onPaid,
}: {
  bono: BonoCalculadoRow
  empresaId: string
  onClose: () => void
  onPaid: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10))
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'DEPOSITO' | 'TRANSFERENCIA' | 'OTRO'>(
    'EFECTIVO',
  )
  const [pending, startTransition] = useTransition()

  const submit = () => {
    if (!file) {
      toast.error('Adjunta un comprobante')
      return
    }
    startTransition(async () => {
      const fd = new FormData()
      fd.append('empresaId', empresaId)
      fd.append('bonoId', bono.id)
      fd.append('metodoPago', metodoPago)
      fd.append('fechaPago', fechaPago)
      fd.append('file', file)
      fd.append('beneficiarioNombre', bono.destinatarioNombre ?? 'Beneficiario bono')
      const res = await marcarPagoBonoAction(fd)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Pago registrado')
        onPaid()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card relative w-full max-w-md rounded-2xl border p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold">Registrar pago de bono</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="bg-muted/40 mb-4 rounded-lg p-3 text-sm">
          <div className="font-medium">{bono.configNombre}</div>
          <div className="text-muted-foreground">{bono.destinatarioNombre}</div>
          <div className="mt-1 text-lg font-bold text-emerald-700">{fmt(bono.montoTotal)}</div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              Método de pago
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as typeof metodoPago)}
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="DEPOSITO">Depósito</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              Fecha de pago
            </label>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-muted-foreground mb-1 block text-xs font-medium">
              Comprobante (PDF, JPG, PNG — máx 20MB)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            {file && <p className="mt-1 text-xs text-emerald-600">{file.name}</p>}
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-muted flex-1 rounded-md border px-3 py-2 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || !file}
            onClick={submit}
            className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? 'Guardando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DesarrollosGrupoSection({
  empresaId,
  desarrollos,
}: {
  empresaId: string
  desarrollos: DesarrolloGrupoRow[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')

  const cambiar = (id: string, grupo: Grupo) => {
    setPendingId(id)
    startTransition(async () => {
      const res = await actualizarGrupoDesarrolloAction({
        empresaId,
        desarrolloId: id,
        grupo,
      })
      setPendingId(null)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Grupo actualizado')
        router.refresh()
      }
    })
  }

  const filtrados = filtro
    ? desarrollos.filter(
        (d) =>
          d.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
          (d.desarrolladora ?? '').toLowerCase().includes(filtro.toLowerCase()),
      )
    : desarrollos

  const counts: Record<Grupo, number> = { YCD: 0, ARKA: 0, RH: 0, OTRO: 0 }
  for (const d of desarrollos) counts[d.grupoDesarrolladora]++

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-sm font-semibold">
            Clasificación de desarrollos por grupo
          </h2>
          <p className="text-muted-foreground text-xs">
            Define a qué grupo pertenece cada desarrollo. Alimenta el cálculo de bono umbral.
          </p>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="bg-muted rounded px-2 py-0.5">YCD: {counts.YCD}</span>
          <span className="bg-muted rounded px-2 py-0.5">ARKA: {counts.ARKA}</span>
          <span className="bg-muted rounded px-2 py-0.5">RH: {counts.RH}</span>
          <span className="bg-muted rounded px-2 py-0.5">OTRO: {counts.OTRO}</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <input
          type="text"
          placeholder="Buscar desarrollo o desarrolladora..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="bg-background w-full rounded-md border px-3 py-1.5 text-sm sm:max-w-xs"
        />
      </div>
      {filtrados.length === 0 ? (
        <p className="text-muted-foreground px-4 py-6 text-sm">Sin resultados.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground sticky top-0 text-xs backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Desarrollo</th>
                <th className="px-3 py-2 text-left font-medium">Desarrolladora</th>
                <th className="px-3 py-2 text-center font-medium">Grupo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map((d) => (
                <tr key={d.id} className={pendingId === d.id ? 'opacity-50' : ''}>
                  <td className="px-3 py-2">{d.nombre}</td>
                  <td className="text-muted-foreground px-3 py-2">{d.desarrolladora ?? '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <select
                      value={d.grupoDesarrolladora}
                      disabled={pending && pendingId === d.id}
                      onChange={(e) => cambiar(d.id, e.target.value as Grupo)}
                      className="bg-background rounded-md border px-2 py-1 text-xs"
                    >
                      {GRUPOS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-muted-foreground mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  )
}
