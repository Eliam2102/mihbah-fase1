'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-dialog'
import {
  actionUpdateUserRole,
  actionGrantAccess,
  actionRevokeAccess,
  actionBanUser,
  actionDeleteUser,
} from '@/app/actions/admin-user'
import { actionSetModuloPermiso, actionResetModulos } from '@/app/actions/admin-modulo'
import { MODULOS_META, getModulosParaTipo } from '@/lib/modulos-config'
import type { ModuloKey } from '@/lib/modulos-config'
import {
  Eye,
  EyeOff,
  Pencil,
  PencilOff,
  RotateCcw,
  Loader2,
  Check,
  X,
  ShieldOff,
  ShieldCheck,
  Trash2,
} from 'lucide-react'

type UserRole = 'super_admin' | 'admin' | 'tesoreria' | 'viewer' | 'user'

const ROL_OPTIONS: { value: UserRole; label: string; desc: string; color: string }[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    desc: 'Control total + aprobación pagos (Carla, Jorge)',
    color: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  {
    value: 'admin',
    label: 'Administración Financiera',
    desc: 'Dispersión y operación — no aprueba (Joana)',
    color: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  },
  {
    value: 'tesoreria',
    label: 'Tesorería',
    desc: 'Solo pagos y comprobantes',
    color: 'border-amber-500 bg-amber-50 text-amber-700',
  },
  {
    value: 'viewer',
    label: 'Dirección / Consulta',
    desc: 'Solo lectura y reportes globales',
    color: 'border-border bg-muted text-muted-foreground',
  },
]

interface ModuloRow {
  modulo: ModuloKey
  puedeVer: boolean
  puedeEditar: boolean
}

interface EmpresaPermisos {
  empresaId: string
  empresaNombre: string
  empresaTipo: string
  modulos: ModuloRow[]
}

interface Props {
  userId: string
  currentRole: string
  tenantId: string
  isSelf: boolean
  isSaasDev: boolean
  isBanned: boolean
  accesos: { empresaId: string; empresaNombre: string; rol: string }[]
  allEmpresas: { id: string; name: string; tipo: string }[]
  empresasPermisos: EmpresaPermisos[]
}

export function UsuarioEditor({
  userId,
  currentRole,
  tenantId,
  isSelf,
  isSaasDev,
  isBanned,
  accesos,
  allEmpresas,
  empresasPermisos,
}: Props) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const role = currentRole ?? 'user'
  const canEditRole = !isSelf && !isSaasDev
  const canEdit = !isSaasDev

  // ── Role change ──────────────────────────────────────────────────────────────
  function handleRoleChange(newRole: UserRole) {
    if (!canEditRole || newRole === role) return
    setError(null)
    startTransition(async () => {
      const res = await actionUpdateUserRole(userId, newRole)
      if (!res.ok) setError(res.error ?? 'Error')
      else router.refresh()
    })
  }

  // ── Bloquear/desbloquear usuario ─────────────────────────────────────────────
  async function handleBan(ban: boolean) {
    if (isSelf) return
    const msg = ban
      ? '¿Bloquear este usuario? No podrá iniciar sesión.'
      : '¿Desbloquear este usuario?'
    const ok = await confirm({
      title: ban ? '¿Bloquear usuario?' : '¿Desbloquear usuario?',
      description: msg,
      confirmText: ban ? 'Bloquear' : 'Desbloquear',
    })
    if (!ok) return
    setError(null)
    startTransition(async () => {
      const res = await actionBanUser(userId, ban)
      if (!res.ok) setError(res.error ?? 'Error')
      else router.refresh()
    })
  }

  // ── Eliminar usuario ─────────────────────────────────────────────────────────
  async function handleDelete() {
    const ok = await confirm({
      title: '¿Eliminar este usuario permanentemente?',
      description:
        'Esta acción no se puede deshacer. El usuario perderá acceso inmediatamente y todos sus datos de sesión serán eliminados.',
      confirmText: 'Eliminar',
    })
    if (!ok) return
    setError(null)
    startTransition(async () => {
      const res = await actionDeleteUser(userId)
      if (!res.ok) setError(res.error ?? 'Error al eliminar')
      else router.push('/configuracion/usuarios')
    })
  }

  // ── Empresa access ───────────────────────────────────────────────────────────
  function handleToggleEmpresa(empresaId: string, hasAccess: boolean) {
    if (!canEdit) return
    setError(null)
    startTransition(async () => {
      const res = hasAccess
        ? await actionRevokeAccess(userId, empresaId)
        : await actionGrantAccess(
            tenantId,
            userId,
            empresaId,
            role === 'admin' ? 'ADMIN' : 'VIEWER',
          )
      if (!res.ok) setError(res.error ?? 'Error')
      else router.refresh()
    })
  }

  // ── Módulo permissions ───────────────────────────────────────────────────────
  function handleToggleVer(empresaId: string, modulo: ModuloKey, row: ModuloRow) {
    if (!canEdit) return
    const newVer = !row.puedeVer
    setError(null)
    startTransition(async () => {
      const res = await actionSetModuloPermiso(
        tenantId,
        userId,
        empresaId,
        modulo,
        newVer,
        newVer ? row.puedeEditar : false,
      )
      if (!res.ok) setError(res.error ?? 'Error')
      else router.refresh()
    })
  }

  function handleToggleEditar(empresaId: string, modulo: ModuloKey, row: ModuloRow) {
    if (!canEdit) return
    setError(null)
    startTransition(async () => {
      const res = await actionSetModuloPermiso(
        tenantId,
        userId,
        empresaId,
        modulo,
        row.puedeVer,
        !row.puedeEditar,
      )
      if (!res.ok) setError(res.error ?? 'Error')
      else router.refresh()
    })
  }

  function handleReset(empresaId: string) {
    if (!canEdit) return
    setError(null)
    startTransition(async () => {
      const res = await actionResetModulos(userId, empresaId)
      if (!res.ok) setError(res.error ?? 'Error')
      else router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      {/* Loading indicator — fixed position so it never shifts layout */}
      {isPending && (
        <div className="fixed right-6 bottom-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Guardando...
        </div>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {/* ── Estado del usuario (bloquear/desbloquear) ────────────────────────── */}
      {!isSelf && !isSaasDev && (
        <div
          className={`rounded-xl border p-4 ${isBanned ? 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20' : 'border-border bg-card'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground text-sm font-semibold">
                {isBanned ? 'Usuario bloqueado' : 'Usuario activo'}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {isBanned
                  ? 'Este usuario no puede iniciar sesión.'
                  : 'El usuario puede iniciar sesión normalmente.'}
              </p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleBan(!isBanned)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                isBanned
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              }`}
            >
              {isBanned ? (
                <>
                  <ShieldCheck className="h-4 w-4" /> Desbloquear
                </>
              ) : (
                <>
                  <ShieldOff className="h-4 w-4" /> Bloquear
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Rol ──────────────────────────────────────────────────────────────── */}
      <div className="border-border bg-card rounded-xl border p-5">
        <h2 className="text-foreground mb-4 text-sm font-semibold">Rol del sistema</h2>
        {isSaasDev ? (
          <p className="text-muted-foreground text-sm">
            El rol de este usuario no puede modificarse desde aquí.
          </p>
        ) : isSelf ? (
          <p className="text-muted-foreground text-sm">No puedes cambiar tu propio rol.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {ROL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={isPending}
                onClick={() => handleRoleChange(opt.value)}
                className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                  role === opt.value
                    ? opt.color
                    : 'border-border text-muted-foreground hover:border-slate-400'
                }`}
              >
                {role === opt.value && <Check className="h-3.5 w-3.5 shrink-0" />}
                <div className="text-left">
                  <div>{opt.label}</div>
                  <div className="text-[10px] font-normal opacity-70">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Acceso empresas ───────────────────────────────────────────────────── */}
      <div className="border-border bg-card rounded-xl border p-5">
        <h2 className="text-foreground mb-1 text-sm font-semibold">Acceso a empresas</h2>
        <p className="text-muted-foreground mb-4 text-xs">
          Las empresas activas determinan qué ve el usuario en el selector de empresa.
        </p>

        {allEmpresas.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin empresas en el tenant.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allEmpresas.map((emp) => {
              const access = accesos.find((a) => a.empresaId === emp.id)
              const hasAccess = !!access
              return (
                <button
                  key={emp.id}
                  type="button"
                  disabled={isPending || !canEdit}
                  onClick={() => handleToggleEmpresa(emp.id, hasAccess)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 text-left transition-colors disabled:cursor-default ${
                    hasAccess
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-border hover:border-slate-400'
                  }`}
                >
                  <div>
                    <p className="text-foreground text-sm font-semibold">{emp.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {emp.tipo.charAt(0) + emp.tipo.slice(1).toLowerCase()}
                      <span
                        className={`transition-opacity ${hasAccess ? 'opacity-100' : 'opacity-0'}`}
                      >
                        {access ? ` · ${access.rol}` : ' · VIEWER'}
                      </span>
                    </p>
                  </div>
                  {hasAccess ? (
                    <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <X className="h-5 w-5 shrink-0 text-slate-300" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Permisos por módulo ───────────────────────────────────────────────── */}
      <div className="border-border bg-card rounded-xl border p-5">
        <h2 className="text-foreground mb-1 text-sm font-semibold">Permisos por módulo</h2>
        <p className="text-muted-foreground mb-5 text-xs">
          Controla qué módulos puede ver y qué acciones puede ejecutar en cada empresa. Sin
          configuración explícita aplica el comportamiento por defecto (todo visible).
        </p>

        {empresasPermisos.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Asigna acceso a al menos una empresa para configurar permisos de módulos.
          </p>
        ) : (
          <div className="space-y-6">
            {empresasPermisos.map((emp) => {
              const modulosDisponibles = getModulosParaTipo(emp.empresaTipo)
              return (
                <div key={emp.empresaId}>
                  {/* Empresa header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-sm font-semibold">
                        {emp.empresaNombre}
                      </span>
                      <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                        {emp.empresaTipo}
                      </span>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleReset(emp.empresaId)}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
                        title="Restaurar permisos por defecto"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restaurar defecto
                      </button>
                    )}
                  </div>

                  {/* Module table */}
                  <div className="border-border overflow-hidden rounded-xl border">
                    {/* Header */}
                    <div className="bg-muted/40 grid grid-cols-[1fr_88px_88px] border-b px-4 py-2">
                      <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                        Módulo
                      </span>
                      <span className="text-muted-foreground text-center text-[10px] font-semibold tracking-widest uppercase">
                        Ver
                      </span>
                      <span className="text-muted-foreground text-center text-[10px] font-semibold tracking-widest uppercase">
                        Editar
                      </span>
                    </div>

                    {modulosDisponibles.map((moduloKey, idx) => {
                      const meta = MODULOS_META[moduloKey]
                      const row = emp.modulos.find((m) => m.modulo === moduloKey) ?? {
                        modulo: moduloKey,
                        puedeVer: true,
                        puedeEditar: false,
                      }
                      const isLast = idx === modulosDisponibles.length - 1

                      return (
                        <div
                          key={moduloKey}
                          className={`grid grid-cols-[1fr_88px_88px] items-center px-4 py-3 ${!isLast ? 'border-border border-b' : ''} ${!row.puedeVer ? 'bg-muted/20' : ''}`}
                        >
                          {/* Module info */}
                          <div>
                            <p
                              className={`text-sm font-medium ${!row.puedeVer ? 'text-muted-foreground' : 'text-foreground'}`}
                            >
                              {meta.label}
                            </p>
                            <p className="text-muted-foreground text-xs">{meta.descripcion}</p>
                          </div>

                          {/* Ver */}
                          <div className="flex justify-center">
                            <button
                              type="button"
                              disabled={isPending || !canEdit}
                              onClick={() => handleToggleVer(emp.empresaId, moduloKey, row)}
                              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-default disabled:opacity-60 ${
                                row.puedeVer
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
                              }`}
                              title={
                                row.puedeVer ? 'Quitar acceso de lectura' : 'Dar acceso de lectura'
                              }
                            >
                              {row.puedeVer ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          {/* Editar */}
                          <div className="flex justify-center">
                            {meta.tieneEdicion ? (
                              <button
                                type="button"
                                disabled={isPending || !canEdit || !row.puedeVer}
                                onClick={() => handleToggleEditar(emp.empresaId, moduloKey, row)}
                                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-default disabled:opacity-40 ${
                                  row.puedeEditar
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                }`}
                                title={
                                  !row.puedeVer
                                    ? 'Requiere ver primero'
                                    : row.puedeEditar
                                      ? `Quitar: ${meta.labelEdicion}`
                                      : `Dar: ${meta.labelEdicion}`
                                }
                              >
                                {row.puedeEditar ? (
                                  <Pencil className="h-4 w-4" />
                                ) : (
                                  <PencilOff className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="text-muted-foreground/30 text-lg">—</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Zona de peligro — eliminar usuario ───────────────────────────────── */}
      {!isSelf && !isSaasDev && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/20">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Zona de peligro</h2>
          <p className="mt-1 text-xs text-red-600 dark:text-red-500">
            Eliminar el usuario es permanente. Si el usuario tiene cortes o comprobantes
            registrados, esta acción será rechazada — bloquéalo en su lugar.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar usuario
          </button>
        </div>
      )}
    </div>
  )
}
