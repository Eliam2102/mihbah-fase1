'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { CheckCircle, Building2, Percent, Pencil, RefreshCw, AlertCircle } from 'lucide-react'
import type { Esquema } from '@/lib/services/comisiones/esquemas.service'
import { EditarEsquemaDialog } from './editar-esquema-dialog'
import { recalcularTodasComisionesAction } from '@/app/actions/comisiones/dispersiones'

export function EsquemasView({ empresaId, esquemas }: { empresaId: string; esquemas: Esquema[] }) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [edit, setEdit] = useState<Esquema | null>(null)
  const [recalcPending, startRecalc] = useTransition()
  const [recalcResult, setRecalcResult] = useState<{
    ok: number
    errores: number
    total: number
    omitidas: number
  } | null>(null)
  const [recalcError, setRecalcError] = useState<string | null>(null)

  async function recalcular() {
    const ok = await confirm({
      title: '¿Recalcular todas las comisiones?',
      description:
        '¿Recalcular TODAS las comisiones existentes con los % actuales? Esto sobreescribe los snapshots viejos. ¿Continuar?',
      confirmText: 'Recalcular',
    })
    if (!ok) return
    setRecalcError(null)
    setRecalcResult(null)
    startRecalc(async () => {
      const r = await recalcularTodasComisionesAction(empresaId)
      if (!r.ok) {
        setRecalcError(r.error)
        return
      }
      setRecalcResult(r.data)
      router.refresh()
    })
  }

  return (
    <>
      <div className="bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-foreground text-sm font-semibold">Recalcular comisiones existentes</p>
          <p className="text-muted-foreground text-xs">
            Si editaste un esquema, las comisiones nuevas usan los nuevos %. Para aplicar también a
            las ventas ya sincronizadas, recalcula todo.
          </p>
        </div>
        <button
          onClick={recalcular}
          disabled={recalcPending}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${recalcPending ? 'animate-spin' : ''}`} />
          {recalcPending ? 'Recalculando...' : 'Recalcular todas'}
        </button>
      </div>

      {recalcResult && (
        <div className="border-success/40 bg-success/10 text-success rounded-md border p-3 text-xs">
          <CheckCircle className="mr-1 inline h-3.5 w-3.5" />
          Recalculadas {recalcResult.ok} de {recalcResult.total} ventas finalizadas.{' '}
          {recalcResult.omitidas > 0 && (
            <span className="text-muted-foreground">
              ({recalcResult.omitidas} en pipeline omitidas — aún no finalizadas)
            </span>
          )}
          {recalcResult.errores > 0 && (
            <span className="text-warning">
              {' '}
              ({recalcResult.errores} con error — revisa con Eliam)
            </span>
          )}
        </div>
      )}

      {recalcError && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-1 rounded-md border p-3 text-xs">
          <AlertCircle className="h-3.5 w-3.5" /> {recalcError}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {esquemas.map((e) => (
          <EsquemaCard key={e.id} esquema={e} onEdit={() => setEdit(e)} />
        ))}
      </div>
      {edit && (
        <EditarEsquemaDialog empresaId={empresaId} esquema={edit} onClose={() => setEdit(null)} />
      )}
    </>
  )
}

function EsquemaCard({ esquema, onEdit }: { esquema: Esquema; onEdit: () => void }) {
  const fmt = (n: string | null | undefined) => (n ? Number(n).toFixed(2) + '%' : '—')
  return (
    <div className="bg-card rounded-lg border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-foreground flex items-center gap-2 text-base font-semibold">
            <Percent className="h-4 w-4" />
            {esquema.nombre}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {esquema.tipoEsquema} · {esquema.tipoProducto}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {esquema.activo && (
            <span className="text-success inline-flex items-center gap-1 text-xs font-semibold">
              <CheckCircle className="h-3 w-3" /> Activo
            </span>
          )}
          <button
            onClick={onEdit}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Item label="% total cliente" value={fmt(esquema.porcentajeTotalCliente)} highlight />
        <Item label="% bolsa comercial" value={fmt(esquema.porcentajeBolsaComercial)} highlight />
        <Item label="% op BM Corp" value={fmt(esquema.porcentajeOpBmcorp)} />
        <Item label="% op YESYUCAN" value={fmt(esquema.porcentajeOpYesyucan)} />
        <Item label="% socio fijo Jorge" value={fmt(esquema.porcentajeSocioFijoJorge)} />
        <Item label="% socio fijo Kass" value={fmt(esquema.porcentajeSocioFijoKass)} />
        <Item label="% asesor estándar" value={fmt(esquema.porcentajeAsesorEstandar)} />
        <Item
          label="% tope líder"
          value={esquema.porcentajeLiderTope ? fmt(esquema.porcentajeLiderTope) : 'Sin tope'}
        />
      </dl>

      {esquema.razonSocial && (
        <div className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
          <Building2 className="h-3 w-3" />
          Factura como: <span className="text-foreground font-medium">{esquema.razonSocial}</span>
        </div>
      )}
      <p className="text-muted-foreground mt-1 text-xs">
        Vigente desde {esquema.fechaInicio}
        {esquema.fechaFin ? ` hasta ${esquema.fechaFin}` : ' (sin vencimiento)'}
      </p>
    </div>
  )
}

function Item({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={`tabular-nums ${highlight ? 'text-foreground font-semibold' : ''}`}>
        {value}
      </dd>
    </div>
  )
}
