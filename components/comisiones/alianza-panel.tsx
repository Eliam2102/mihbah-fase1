'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  AlertTriangle,
  GitBranch,
  Users,
  Pencil,
  Percent,
  Plus,
  Settings2,
  TerminalSquare,
} from 'lucide-react'
import type { Matriz } from '@/lib/services/comisiones/esquemas.service'
import { desactivarAfiliadoAction } from '@/app/actions/comisiones/alianzas'
import type { AlianzaConRelaciones } from './alianzas-view'
import { AlianzaForm } from './alianza-form'
import { LiderForm } from './lider-form'
import { LiderRow } from './lider-row'
import { AsesorForm } from './asesor-form'
import { AsesorRow } from './asesor-row'
import { ConfirmInline } from './confirm-inline'
import { MatrizDialog } from './matriz-dialog'

export function AlianzaPanel({
  empresaId,
  alianza,
  onBack,
}: {
  empresaId: string
  alianza: AlianzaConRelaciones
  onBack?: () => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [editingAlianza, setEditingAlianza] = useState(false)
  const [creatingLider, setCreatingLider] = useState(false)
  const [creatingAsesor, setCreatingAsesor] = useState(false)
  const [matrizModal, setMatrizModal] = useState<{
    tipoProducto: 'TERRENO' | 'ACCION'
    actual: Matriz | null
  } | null>(null)

  async function handleDeleteAlianza() {
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await desactivarAfiliadoAction(empresaId, alianza.afiliado.id)
        if (result.ok) router.refresh()
        resolve()
      })
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {editingAlianza ? (
        <AlianzaForm
          empresaId={empresaId}
          alianza={alianza.afiliado}
          onDone={() => setEditingAlianza(false)}
          onCancel={() => setEditingAlianza(false)}
        />
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="from-primary/5 to-jade-50 dark:to-jade-950/20 border-b bg-gradient-to-br p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md lg:hidden"
                    aria-label="Volver"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div>
                  <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    Alianza
                  </p>
                  <h2 className="text-foreground mt-0.5 text-xl font-bold sm:text-2xl">
                    {alianza.afiliado.nombre}
                  </h2>
                  <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    {alianza.afiliado.mondayLabel ? (
                      <span className="bg-muted/70 inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px]">
                        <TerminalSquare className="h-2.5 w-2.5" />
                        {alianza.afiliado.mondayLabel}
                      </span>
                    ) : (
                      <span className="text-warning inline-flex items-center gap-1 text-[11px]">
                        <AlertTriangle className="h-3 w-3" />
                        Sin Monday label
                      </span>
                    )}
                    {alianza.afiliado.contacto && <span>· {alianza.afiliado.contacto}</span>}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingAlianza(true)}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                  title="Editar alianza"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
                <ConfirmInline
                  onConfirm={handleDeleteAlianza}
                  label="Desactivar"
                  question="¿Desactivar alianza?"
                  size="md"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 sm:p-5">
            <Stat
              icon={<GitBranch className="h-3.5 w-3.5" />}
              label="Líderes"
              value={alianza.lideres.length}
            />
            <Stat
              icon={<Users className="h-3.5 w-3.5" />}
              label="Asesores"
              value={alianza.asesores.length}
            />
            <Stat
              icon={<Percent className="h-3.5 w-3.5" />}
              label="Matriz Terrenos"
              value={
                alianza.matrizTerreno && !alianza.matrizTerreno.requiereConfig
                  ? `${alianza.matrizTerreno.porcentajeAfiliacion}%`
                  : '—'
              }
              accent={
                !alianza.matrizTerreno || alianza.matrizTerreno.requiereConfig
                  ? 'warning'
                  : 'success'
              }
            />
            <Stat
              icon={<Percent className="h-3.5 w-3.5" />}
              label="Matriz YCD"
              value={
                alianza.matrizAccion && !alianza.matrizAccion.requiereConfig
                  ? `${alianza.matrizAccion.porcentajeAfiliacion}%`
                  : '—'
              }
              accent={
                !alianza.matrizAccion || alianza.matrizAccion.requiereConfig ? 'warning' : 'success'
              }
            />
          </div>
        </div>
      )}

      {/* Matrices config */}
      <div className="grid gap-3 sm:grid-cols-2">
        <MatrizCard
          tipo="TERRENO"
          matriz={alianza.matrizTerreno}
          onConfig={() =>
            setMatrizModal({ tipoProducto: 'TERRENO', actual: alianza.matrizTerreno })
          }
        />
        <MatrizCard
          tipo="ACCION"
          matriz={alianza.matrizAccion}
          onConfig={() => setMatrizModal({ tipoProducto: 'ACCION', actual: alianza.matrizAccion })}
        />
      </div>

      {/* Líderes */}
      <Section
        icon={<GitBranch className="h-3.5 w-3.5" />}
        title="Líderes"
        count={alianza.lideres.length}
        actionLabel="Nuevo líder"
        onAction={() => setCreatingLider(true)}
        actionActive={creatingLider}
      >
        {creatingLider && (
          <LiderForm
            empresaId={empresaId}
            afiliadoId={alianza.afiliado.id}
            onDone={() => setCreatingLider(false)}
            onCancel={() => setCreatingLider(false)}
          />
        )}
        {alianza.lideres.length === 0 && !creatingLider ? (
          <EmptyHint
            text="Aún no hay líderes en esta alianza."
            cta="Crear el primero"
            onCta={() => setCreatingLider(true)}
          />
        ) : (
          <div className="space-y-2">
            {alianza.lideres.map((l) => (
              <LiderRow key={l.id} empresaId={empresaId} lider={l} />
            ))}
          </div>
        )}
      </Section>

      {/* Asesores */}
      <Section
        icon={<Users className="h-3.5 w-3.5" />}
        title="Asesores"
        count={alianza.asesores.length}
        actionLabel="Nuevo asesor"
        onAction={() => setCreatingAsesor(true)}
        actionActive={creatingAsesor}
      >
        {creatingAsesor && (
          <AsesorForm
            empresaId={empresaId}
            afiliadoId={alianza.afiliado.id}
            lideres={alianza.lideres}
            onDone={() => setCreatingAsesor(false)}
            onCancel={() => setCreatingAsesor(false)}
          />
        )}
        {alianza.asesores.length === 0 && !creatingAsesor ? (
          <EmptyHint
            text="Aún no hay asesores en esta alianza."
            cta="Crear el primero"
            onCta={() => setCreatingAsesor(true)}
          />
        ) : (
          <div className="space-y-2">
            {alianza.asesores.map((a) => (
              <AsesorRow key={a.id} empresaId={empresaId} asesor={a} lideres={alianza.lideres} />
            ))}
          </div>
        )}
      </Section>

      {matrizModal && (
        <MatrizDialog
          empresaId={empresaId}
          afiliadoId={alianza.afiliado.id}
          afiliadoNombre={alianza.afiliado.nombre}
          tipoProducto={matrizModal.tipoProducto}
          matrizActual={matrizModal.actual}
          lideres={alianza.lideres}
          onClose={() => setMatrizModal(null)}
        />
      )}
    </div>
  )
}

function MatrizCard({
  tipo,
  matriz,
  onConfig,
}: {
  tipo: 'TERRENO' | 'ACCION'
  matriz: Matriz | null
  onConfig: () => void
}) {
  const titulo = tipo === 'TERRENO' ? 'Matriz Terrenos' : 'Matriz YCD'
  const ok = matriz && !matriz.requiereConfig

  const tieneNota = matriz && matriz.notas && matriz.notas.trim().length > 0

  return (
    <div
      className={`bg-card flex flex-col gap-2 rounded-xl border p-3.5 shadow-sm ${
        ok ? '' : 'border-warning/30 bg-warning/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            ok ? 'bg-success/10 text-success' : 'bg-warning/15 text-warning'
          }`}
        >
          <Percent className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            {titulo}
          </p>
          {ok ? (
            <p className="text-foreground text-sm font-semibold tabular-nums">
              {matriz!.porcentajeAfiliacion}% afiliación
            </p>
          ) : (
            <p className="text-warning text-xs font-medium">
              {matriz ? 'Requiere configuración' : 'No configurada'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onConfig}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium"
        >
          <Settings2 className="h-3 w-3" />
          Configurar
        </button>
      </div>
      {tieneNota && (
        <div className="bg-warning/10 border-warning/30 text-warning rounded-md border px-2.5 py-1.5 text-[11px] leading-relaxed">
          <span className="font-semibold tracking-wide uppercase">Por validar:</span>{' '}
          {matriz!.notas}
        </div>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  count,
  actionLabel,
  onAction,
  actionActive,
  children,
}: {
  icon: React.ReactNode
  title: string
  count: number
  actionLabel: string
  onAction: () => void
  actionActive: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="text-foreground text-sm font-semibold">{title}</h3>
          <span className="bg-muted text-muted-foreground rounded-full px-2 text-[10px] font-medium tabular-nums">
            {count}
          </span>
        </div>
        <button
          type="button"
          onClick={onAction}
          disabled={actionActive}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          {actionLabel}
        </button>
      </div>
      <div className="space-y-2 p-4">{children}</div>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  accent?: 'success' | 'warning'
}) {
  const valueCls =
    accent === 'success'
      ? 'text-success'
      : accent === 'warning'
        ? 'text-warning'
        : 'text-foreground'
  return (
    <div>
      <div className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
        {icon} {label}
      </div>
      <p className={`mt-1 text-lg font-bold tabular-nums ${valueCls}`}>{value}</p>
    </div>
  )
}

function EmptyHint({ text, cta, onCta }: { text: string; cta: string; onCta: () => void }) {
  return (
    <div className="border-border/60 flex flex-col items-center gap-2 rounded-lg border border-dashed py-6 text-center">
      <p className="text-muted-foreground text-xs">{text}</p>
      <button
        type="button"
        onClick={onCta}
        className="text-primary text-xs font-medium hover:underline"
      >
        {cta}
      </button>
    </div>
  )
}
