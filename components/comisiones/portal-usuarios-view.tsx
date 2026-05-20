'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X, ShieldCheck, User, Power, KeyRound } from 'lucide-react'
import {
  crearUsuarioPortalAction,
  toggleActivoUsuarioPortalAction,
  resetearPasswordPortalAction,
  eliminarUsuarioPortalAction,
} from '@/app/actions/comisiones/portal-usuarios'
import type { Lider, Asesor } from '@/lib/services/comisiones/alianzas.service'
import type { UsuarioPortalDetalle } from '@/lib/services/comisiones/usuarios-portal.service'

// Lider y Asesor con nombre de alianza inyectado (resuelto en el server component)
type LiderConAlianza = Lider & { alianzaNombre: string }
type AsesorConAlianza = Asesor & { alianzaNombre: string }

export function PortalUsuariosView({
  empresaId,
  usuarios,
  lideres,
  asesores,
}: {
  empresaId: string
  usuarios: UsuarioPortalDetalle[]
  lideres: LiderConAlianza[]
  asesores: AsesorConAlianza[]
}) {
  const [dialog, setDialog] = useState(false)
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setDialog(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo usuario
        </button>
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Nombre</th>
              <th className="px-3 py-2 text-left font-medium">Rol</th>
              <th className="px-3 py-2 text-left font-medium">Vinculado a</th>
              <th className="px-3 py-2 text-center font-medium">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-3 py-8 text-center">
                  <User className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  No hay usuarios del portal. Click &quot;Nuevo usuario&quot; para crear el primero.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <FilaUsuario key={u.usuario.id} empresaId={empresaId} usuario={u} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {dialog && (
        <NuevoUsuarioDialog
          empresaId={empresaId}
          lideres={lideres}
          asesores={asesores}
          onClose={() => setDialog(false)}
        />
      )}
    </div>
  )
}

function FilaUsuario({ empresaId, usuario }: { empresaId: string; usuario: UsuarioPortalDetalle }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resetOpen, setResetOpen] = useState(false)

  function toggleActivo() {
    const next = !usuario.usuario.activo
    const verbo = next ? 'Activar' : 'Desactivar'
    if (!confirm(`${verbo} el acceso de ${usuario.userEmail}?`)) return
    startTransition(async () => {
      await toggleActivoUsuarioPortalAction(empresaId, usuario.usuario.id, next)
      router.refresh()
    })
  }

  function eliminar() {
    const ok = confirm(
      `⚠ ELIMINAR cuenta de ${usuario.userEmail}?\n\n` +
        `Esto borra el usuario y su acceso permanentemente. No se puede deshacer.\n\n` +
        `Si solo quieres bloquear acceso temporal, mejor usa "Desactivar".\n\n` +
        `¿Continuar con eliminación?`,
    )
    if (!ok) return
    startTransition(async () => {
      const result = await eliminarUsuarioPortalAction(empresaId, usuario.usuario.id)
      if (!result.ok) alert(result.error)
      router.refresh()
    })
  }

  return (
    <>
      <tr className="hover:bg-muted/20">
        <td className="px-3 py-2 font-medium">{usuario.userEmail}</td>
        <td className="px-3 py-2">{usuario.userName}</td>
        <td className="px-3 py-2 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
              usuario.usuario.rolPortal === 'LIDER_ALIANZA'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            {usuario.usuario.rolPortal === 'LIDER_ALIANZA' ? 'Líder' : 'Asesor'}
          </span>
        </td>
        <td className="text-muted-foreground px-3 py-2 text-xs">
          {usuario.liderNombre ?? usuario.asesorNombre ?? '—'}
        </td>
        <td className="px-3 py-2 text-center text-xs">
          {usuario.usuario.activo ? (
            <span className="text-success font-semibold">Activo</span>
          ) : (
            <span className="text-muted-foreground">Inactivo</span>
          )}
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setResetOpen(true)}
              disabled={pending}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1 rounded px-2 py-1 text-xs disabled:opacity-60"
              title="Resetear password"
            >
              <KeyRound className="h-3 w-3" /> Password
            </button>
            <button
              onClick={toggleActivo}
              disabled={pending}
              title={usuario.usuario.activo ? 'Desactivar temporalmente' : 'Reactivar acceso'}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs disabled:opacity-60 ${
                usuario.usuario.activo
                  ? 'text-warning hover:bg-warning/10'
                  : 'text-success hover:bg-success/10'
              }`}
            >
              <Power className="h-3 w-3" />
              {usuario.usuario.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button
              onClick={eliminar}
              disabled={pending}
              title="Eliminar permanentemente"
              className="text-destructive hover:bg-destructive/10 inline-flex items-center gap-1 rounded px-2 py-1 text-xs disabled:opacity-60"
            >
              <Trash2 className="h-3 w-3" /> Eliminar
            </button>
          </div>
        </td>
      </tr>
      {resetOpen && (
        <ResetPasswordDialog
          empresaId={empresaId}
          usuarioPortalId={usuario.usuario.id}
          userEmail={usuario.userEmail}
          onClose={() => setResetOpen(false)}
        />
      )}
    </>
  )
}

function ResetPasswordDialog({
  empresaId,
  usuarioPortalId,
  userEmail,
  onClose,
}: {
  empresaId: string
  usuarioPortalId: string
  userEmail: string
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await resetearPasswordPortalAction(empresaId, {
        usuarioPortalId,
        newPassword,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card relative w-full max-w-sm rounded-lg border p-6 shadow-lg">
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold">Resetear password</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Cuenta: <span className="text-foreground font-medium">{userEmail}</span>
        </p>

        {success ? (
          <div className="border-success/40 bg-success/10 text-success mt-4 rounded-md border p-3 text-xs">
            <p className="font-medium">Password actualizada.</p>
            <p className="text-muted-foreground mt-1">
              Comparte la nueva password al usuario por canal seguro (WhatsApp directo, no grupo).
            </p>
            <button
              onClick={onClose}
              className="bg-primary text-primary-foreground mt-2 rounded-md px-3 py-1.5 text-xs"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="text-muted-foreground mb-1 block text-xs font-medium uppercase">
                Nueva password (mínimo 8 caracteres)
              </span>
              <input
                type="text"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="Ej. JadeP@rtner2026"
                autoComplete="new-password"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Genera una password fuerte y compártela por canal seguro.
              </p>
            </label>
            {error && <p className="text-destructive text-xs">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-secondary text-secondary-foreground rounded-md px-3 py-1.5 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm disabled:opacity-60"
              >
                {pending ? 'Guardando...' : 'Resetear'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function NuevoUsuarioDialog({
  empresaId,
  lideres,
  asesores,
  onClose,
}: {
  empresaId: string
  lideres: LiderConAlianza[]
  asesores: AsesorConAlianza[]
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    rolPortal: 'ASESOR' as 'LIDER_ALIANZA' | 'ASESOR',
    liderId: '',
    asesorId: '',
    email: '',
    nombre: '',
    password: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await crearUsuarioPortalAction(empresaId, {
        rolPortal: form.rolPortal,
        liderId: form.rolPortal === 'LIDER_ALIANZA' ? form.liderId : null,
        asesorId: form.rolPortal === 'ASESOR' ? form.asesorId : null,
        email: form.email,
        nombre: form.nombre,
        password: form.password,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card relative w-full max-w-md rounded-lg border p-6 shadow-lg">
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold">Nuevo usuario portal</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Crea cuenta + password temporal. El usuario podrá cambiarlo en su primer login.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Field label="Rol">
            <select
              value={form.rolPortal}
              onChange={(e) =>
                setForm({
                  ...form,
                  rolPortal: e.target.value as 'LIDER_ALIANZA' | 'ASESOR',
                })
              }
              className="input"
            >
              <option value="ASESOR">Asesor</option>
              <option value="LIDER_ALIANZA">Líder de alianza</option>
            </select>
          </Field>

          {form.rolPortal === 'LIDER_ALIANZA' ? (
            <Field label="Líder *">
              <select
                required
                value={form.liderId}
                onChange={(e) => setForm({ ...form, liderId: e.target.value })}
                className="input"
              >
                <option value="">— Selecciona —</option>
                {[...lideres]
                  .sort((a, b) =>
                    `${a.alianzaNombre} ${a.nombre}`.localeCompare(
                      `${b.alianzaNombre} ${b.nombre}`,
                    ),
                  )
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.alianzaNombre} · {l.nombre}
                    </option>
                  ))}
              </select>
              <p className="text-muted-foreground mt-1 text-xs">
                Formato: <strong>Alianza · Nombre del líder</strong>
              </p>
            </Field>
          ) : (
            <Field label="Asesor *">
              <select
                required
                value={form.asesorId}
                onChange={(e) => setForm({ ...form, asesorId: e.target.value })}
                className="input"
              >
                <option value="">— Selecciona —</option>
                {[...asesores]
                  .sort((a, b) =>
                    `${a.alianzaNombre} ${a.nombre}`.localeCompare(
                      `${b.alianzaNombre} ${b.nombre}`,
                    ),
                  )
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.alianzaNombre} · {a.nombre}
                    </option>
                  ))}
              </select>
              <p className="text-muted-foreground mt-1 text-xs">
                Formato: <strong>Alianza · Nombre del asesor</strong>
              </p>
            </Field>
          )}

          <Field label="Nombre completo *">
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Email *">
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Password temporal * (mínimo 8 caracteres)">
            <input
              required
              type="text"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
              placeholder="Comparte por canal seguro"
            />
          </Field>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-3 py-1.5 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm disabled:opacity-60"
            >
              {pending ? 'Creando...' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-xs font-medium uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}
