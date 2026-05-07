'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  actionUpdateUserRole,
  actionGrantAccess,
  actionRevokeAccess,
} from '@/app/actions/admin-user'
import { actionSetModuloPermiso, actionResetModulos } from '@/app/actions/admin-modulo'
import { MODULOS_META, getModulosParaTipo } from '@/lib/modulos-config'
import type { ModuloKey } from '@/lib/modulos-config'
import { Eye, EyeOff, Pencil, PencilOff, RotateCcw, Loader2, Check, X } from 'lucide-react'

type UserRole = 'super_admin' | 'admin' | 'user'

const ROL_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    color: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  },
  {
    value: 'admin',
    label: 'Admin',
    color:
      'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
  { value: 'user', label: 'Viewer', color: 'border-border bg-muted text-muted-foreground' },
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
  accesos,
  allEmpresas,
  empresasPermisos,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const role = currentRole ?? 'user'
  const canEdit = !isSelf && !isSaasDev

  // ── Role change ──────────────────────────────────────────────────────────────
  function handleRoleChange(newRole: UserRole) {
    if (!canEdit || newRole === role) return
    setError(null)
    startTransition(async () => {
      const res = await actionUpdateUserRole(userId, newRole)
      if (!res.ok) setError(res.error ?? 'Error')
      else router.refresh()
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
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Guardando cambios...
        </div>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {/* ── Rol ──────────────────────────────────────────────────────────────── */}
      <div className="border-border bg-card rounded-xl border p-5">
        <h2 className="text-foreground mb-4 text-sm font-semibold">Rol del sistema</h2>
        {isSaasDev ? (
          <p className="text-muted-foreground text-sm">
            Este usuario es SaaS Owner — el rol no se puede cambiar desde aquí.
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
                {role === opt.value && <Check className="h-3.5 w-3.5" />}
                {opt.label}
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
                  className={`flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all disabled:cursor-default ${
                    hasAccess
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-border hover:border-slate-400'
                  }`}
                >
                  <div>
                    <p
                      className={`text-sm font-semibold ${hasAccess ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}
                    >
                      {emp.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {emp.tipo.charAt(0) + emp.tipo.slice(1).toLowerCase()}
                      {hasAccess && ` · ${access.rol}`}
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
                              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all disabled:cursor-default disabled:opacity-60 ${
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
                                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all disabled:cursor-default disabled:opacity-40 ${
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
    </div>
  )
}
