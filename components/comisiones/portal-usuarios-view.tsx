'use client'

import { useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  X,
  ShieldCheck,
  User,
  Power,
  KeyRound,
  Search,
  Users,
  UserCheck,
  Crown,
  UserX,
} from 'lucide-react'
import {
  crearUsuarioPortalAction,
  toggleActivoUsuarioPortalAction,
  resetearPasswordPortalAction,
  eliminarUsuarioPortalAction,
} from '@/app/actions/comisiones/portal-usuarios'
import { useConfirm } from '@/components/ui/confirm-dialog'
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
  const [query, setQuery] = useState('')
  const [rolFilter, setRolFilter] = useState<
    'TODOS' | 'LIDER_ALIANZA' | 'ADMINISTRATIVO' | 'ASESOR'
  >('TODOS')
  const [estadoFilter, setEstadoFilter] = useState<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS')

  const usuariosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    return usuarios.filter((u) => {
      if (rolFilter !== 'TODOS' && u.usuario.rolPortal !== rolFilter) return false
      if (estadoFilter === 'ACTIVO' && !u.usuario.activo) return false
      if (estadoFilter === 'INACTIVO' && u.usuario.activo) return false
      if (q) {
        const haystack = [u.userEmail, u.userName, u.liderNombre ?? '', u.asesorNombre ?? '']
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [usuarios, query, rolFilter, estadoFilter])

  const counts = useMemo(() => {
    const lideres = usuarios.filter((u) => u.usuario.rolPortal === 'LIDER_ALIANZA').length
    const administrativos = usuarios.filter((u) => u.usuario.rolPortal === 'ADMINISTRATIVO').length
    const asesores = usuarios.filter((u) => u.usuario.rolPortal === 'ASESOR').length
    const activos = usuarios.filter((u) => u.usuario.activo).length
    const inactivos = usuarios.length - activos
    return { total: usuarios.length, lideres, administrativos, asesores, activos, inactivos }
  }, [usuarios])

  return (
    <div className="space-y-6">
      {/* Hero stats card */}
      <div className="from-jade-700 via-jade-800 to-jade-900 relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-sm">
        <div className="bg-jade-400/20 absolute -top-12 -right-12 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-jade-300/10 absolute -bottom-16 -left-12 h-56 w-56 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-jade-100 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                <Users className="h-3.5 w-3.5" />
                Cuentas del portal
              </div>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Usuarios del portal</h1>
              <p className="text-jade-50/90 mt-1 text-sm">
                {counts.total} cuenta{counts.total === 1 ? '' : 's'} totales · {counts.lideres}{' '}
                líder{counts.lideres === 1 ? '' : 'es'} · {counts.administrativos} admin
                {counts.administrativos === 1 ? '' : 's'} · {counts.asesores} asesor
                {counts.asesores === 1 ? '' : 'es'}
              </p>
            </div>
            <button
              onClick={() => setDialog(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow-sm transition-colors hover:opacity-90"
              style={{ color: '#14532d' }}
            >
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <HeroStat icon={<Users className="h-4 w-4" />} label="Total" value={counts.total} />
            <HeroStat icon={<Crown className="h-4 w-4" />} label="Líderes" value={counts.lideres} />
            <HeroStat
              icon={<UserCheck className="h-4 w-4" />}
              label="Activos"
              value={counts.activos}
            />
            <HeroStat
              icon={<UserX className="h-4 w-4" />}
              label="Inactivos"
              value={counts.inactivos}
            />
          </div>
        </div>
      </div>

      {/* Barra de búsqueda + filtros agrupados en card */}
      <div className="bg-card rounded-xl border p-3 shadow-sm sm:p-4">
        <div className="border-border focus-within:border-primary focus-within:ring-primary/20 bg-background flex items-center gap-2 rounded-lg border px-3 py-2 transition focus-within:ring-2">
          <Search className="text-muted-foreground h-4 w-4 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por email, nombre o alianza..."
            className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1"
              title="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground mr-1 text-[11px] font-semibold tracking-wide uppercase">
            Rol
          </span>
          <Chip active={rolFilter === 'TODOS'} onClick={() => setRolFilter('TODOS')}>
            Todos <Badge>{counts.total}</Badge>
          </Chip>
          <Chip
            active={rolFilter === 'LIDER_ALIANZA'}
            onClick={() => setRolFilter('LIDER_ALIANZA')}
            icon={<Crown className="h-3 w-3" />}
          >
            Líderes <Badge>{counts.lideres}</Badge>
          </Chip>
          <Chip
            active={rolFilter === 'ADMINISTRATIVO'}
            onClick={() => setRolFilter('ADMINISTRATIVO')}
            icon={<ShieldCheck className="h-3 w-3" />}
          >
            Admins <Badge>{counts.administrativos}</Badge>
          </Chip>
          <Chip
            active={rolFilter === 'ASESOR'}
            onClick={() => setRolFilter('ASESOR')}
            icon={<User className="h-3 w-3" />}
          >
            Asesores <Badge>{counts.asesores}</Badge>
          </Chip>
          <span className="border-border mx-2 hidden h-4 border-l sm:inline-block" />
          <span className="text-muted-foreground mr-1 text-[11px] font-semibold tracking-wide uppercase">
            Estado
          </span>
          <Chip active={estadoFilter === 'TODOS'} onClick={() => setEstadoFilter('TODOS')}>
            Todos
          </Chip>
          <Chip
            active={estadoFilter === 'ACTIVO'}
            onClick={() => setEstadoFilter('ACTIVO')}
            icon={<UserCheck className="h-3 w-3" />}
          >
            Activos <Badge>{counts.activos}</Badge>
          </Chip>
          <Chip
            active={estadoFilter === 'INACTIVO'}
            onClick={() => setEstadoFilter('INACTIVO')}
            icon={<UserX className="h-3 w-3" />}
          >
            Inactivos <Badge>{counts.inactivos}</Badge>
          </Chip>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="bg-muted/30 border-b px-4 py-2.5">
          <p className="text-muted-foreground text-xs font-medium">
            {usuariosFiltrados.length} de {usuarios.length} usuarios
            {query || rolFilter !== 'TODOS' || estadoFilter !== 'TODOS' ? (
              <button
                onClick={() => {
                  setQuery('')
                  setRolFilter('TODOS')
                  setEstadoFilter('TODOS')
                }}
                className="text-primary ml-2 hover:underline"
              >
                Limpiar filtros
              </button>
            ) : null}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/20 text-muted-foreground text-xs">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Usuario</th>
                <th className="px-4 py-2.5 text-left font-medium">Rol</th>
                <th className="px-4 py-2.5 text-left font-medium">Vinculado a</th>
                <th className="px-4 py-2.5 text-center font-medium">Estado</th>
                <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted-foreground px-4 py-12 text-center">
                    <User className="mx-auto mb-3 h-8 w-8 opacity-30" />
                    <p className="font-medium">Sin cuentas del portal</p>
                    <p className="mt-1 text-xs">
                      Click &quot;Nuevo usuario&quot; arriba para crear la primera.
                    </p>
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted-foreground px-4 py-12 text-center">
                    <Search className="mx-auto mb-3 h-8 w-8 opacity-30" />
                    <p className="font-medium">Sin resultados</p>
                    <p className="mt-1 text-xs">Ajusta los filtros o limpia la búsqueda.</p>
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => (
                  <FilaUsuario key={u.usuario.id} empresaId={empresaId} usuario={u} />
                ))
              )}
            </tbody>
          </table>
        </div>
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

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-jade-950/30 rounded-xl px-3 py-2.5 backdrop-blur-sm">
      <div className="text-jade-200 inline-flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'border-border text-foreground hover:bg-muted/50 bg-card'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-background/40 ml-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold opacity-90">
      {children}
    </span>
  )
}

function FilaUsuario({ empresaId, usuario }: { empresaId: string; usuario: UsuarioPortalDetalle }) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [pending, startTransition] = useTransition()
  const [resetOpen, setResetOpen] = useState(false)

  async function toggleActivo() {
    const next = !usuario.usuario.activo
    const verbo = next ? 'Activar' : 'Desactivar'
    const ok = await confirm({
      title: `${verbo} acceso`,
      description: `¿${verbo} el acceso de ${usuario.userEmail}?`,
      confirmText: verbo,
    })
    if (!ok) return
    startTransition(async () => {
      await toggleActivoUsuarioPortalAction(empresaId, usuario.usuario.id, next)
      router.refresh()
    })
  }

  async function eliminar() {
    const ok = await confirm({
      title: `Eliminar cuenta de ${usuario.userEmail}`,
      description: `Esto borra el usuario y su acceso permanentemente. No se puede deshacer.\n\nSi solo quieres bloquear acceso temporal, mejor usa "Desactivar".`,
      confirmText: 'Eliminar',
    })
    if (!ok) return
    startTransition(async () => {
      const result = await eliminarUsuarioPortalAction(empresaId, usuario.usuario.id)
      if (!result.ok) alert(result.error)
      router.refresh()
    })
  }

  const initials =
    usuario.userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'U'

  const esLider = usuario.usuario.rolPortal === 'LIDER_ALIANZA'
  const esAdmin = usuario.usuario.rolPortal === 'ADMINISTRATIVO'

  return (
    <>
      <tr
        className={`hover:bg-muted/20 transition-colors ${!usuario.usuario.activo ? 'opacity-60' : ''}`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-sm"
              style={{
                background: esLider
                  ? 'linear-gradient(135deg, #16a34a, #14532d)'
                  : esAdmin
                    ? 'linear-gradient(135deg, #0ea5e9, #0369a1)'
                    : 'linear-gradient(135deg, #4ade80, #16a34a)',
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-medium">{usuario.userName}</p>
              <p className="text-muted-foreground truncate text-xs">{usuario.userEmail}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              esLider
                ? 'bg-jade-600 text-jade-900 ring-jade-300 dark:bg-jade-400 dark:text-jade-500 dark:ring-jade-800'
                : esAdmin
                  ? 'bg-blue-100 text-blue-700 ring-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800'
                  : 'bg-muted text-foreground ring-border'
            }`}
          >
            {esLider ? (
              <Crown className="h-3 w-3" />
            ) : esAdmin ? (
              <ShieldCheck className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
            {esLider ? 'Líder' : esAdmin ? 'Admin' : 'Asesor'}
          </span>
        </td>
        <td className="text-muted-foreground px-4 py-3 text-xs">
          {usuario.liderNombre ?? usuario.asesorNombre ?? '—'}
        </td>
        <td className="px-4 py-3 text-center">
          {usuario.usuario.activo ? (
            <span className="bg-success/10 text-success ring-success/30 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset">
              <span className="bg-success h-1.5 w-1.5 rounded-full" />
              Activo
            </span>
          ) : (
            <span className="bg-muted text-muted-foreground ring-border inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset">
              <span className="bg-muted-foreground/40 h-1.5 w-1.5 rounded-full" />
              Inactivo
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setResetOpen(true)}
              disabled={pending}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-60"
              title="Resetear password"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={toggleActivo}
              disabled={pending}
              title={usuario.usuario.activo ? 'Desactivar temporalmente' : 'Reactivar acceso'}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-60 ${
                usuario.usuario.activo
                  ? 'text-warning hover:bg-warning/10'
                  : 'text-success hover:bg-success/10'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={eliminar}
              disabled={pending}
              title="Eliminar permanentemente"
              className="text-destructive hover:bg-destructive/10 inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {resetOpen && (
        <ModalPortal>
          <ResetPasswordDialog
            empresaId={empresaId}
            usuarioPortalId={usuario.usuario.id}
            userEmail={usuario.userEmail}
            onClose={() => setResetOpen(false)}
          />
        </ModalPortal>
      )}
    </>
  )
}

// Renderiza children en document.body para evitar <div> dentro de <tbody>
// (HTML inválido → hydration error en Next.js).
function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
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
          <form method="post" action="#" onSubmit={handleSubmit} className="mt-4 space-y-3">
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
    rolPortal: 'ASESOR' as 'LIDER_ALIANZA' | 'ADMINISTRATIVO' | 'ASESOR',
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
        liderId:
          form.rolPortal === 'LIDER_ALIANZA' || form.rolPortal === 'ADMINISTRATIVO'
            ? form.liderId
            : null,
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

        <form method="post" action="#" onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Field label="Rol">
            <select
              value={form.rolPortal}
              onChange={(e) =>
                setForm({
                  ...form,
                  rolPortal: e.target.value as 'LIDER_ALIANZA' | 'ADMINISTRATIVO' | 'ASESOR',
                })
              }
              className="input"
            >
              <option value="ASESOR">Asesor</option>
              <option value="LIDER_ALIANZA">Líder de alianza</option>
              <option value="ADMINISTRATIVO">Administrativo</option>
            </select>
          </Field>

          {form.rolPortal === 'LIDER_ALIANZA' || form.rolPortal === 'ADMINISTRATIVO' ? (
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
