'use client'

import { useActionState } from 'react'
import { recuperarAction } from './actions'

export default function RecuperarPage() {
  const [state, action, pending] = useActionState(recuperarAction, null)

  if (state && 'success' in state) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <span className="text-xl text-green-600">✓</span>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Revisa tu correo</h2>
        <p className="text-sm text-gray-500">
          Si el correo existe en el sistema, recibirás instrucciones para recuperar tu contraseña.
        </p>
        <a href="/login" className="mt-6 inline-block text-sm text-blue-600 hover:underline">
          Volver al inicio de sesión
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.
        </p>
      </div>

      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="tu@correo.com"
          />
        </div>

        {state && 'error' in state && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{'error' in state ? state.error : ''}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Enviando...' : 'Enviar instrucciones'}
        </button>

        <div className="text-center">
          <a href="/login" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
            Volver al inicio de sesión
          </a>
        </div>
      </form>
    </div>
  )
}
