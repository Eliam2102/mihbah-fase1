'use server'

import { requireUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { afiliados, matrizAlianzaProducto, lideresAlianza, esquemasComision } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, isNull, lte, or, gte, sql } from 'drizzle-orm'
import { calcular, type CalculatorOutput } from '@/lib/services/comisiones/calculator'
import { z } from 'zod'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

const schema = z.object({
  afiliadoId: z.string().uuid(),
  tipoProducto: z.enum(['TERRENO', 'ACCION']),
  montoVenta: z.number().positive(),
  enganchePagado: z.number().nonnegative(),
})

export async function precalcularAction(
  input: z.input<typeof schema>,
): Promise<ActionResult<CalculatorOutput>> {
  try {
    const user = await requireUser()
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: 'Validación falló' }
    }
    const tenantId = user.tenantId!
    const { afiliadoId, tipoProducto, montoVenta, enganchePagado } = parsed.data
    const hoy = new Date().toISOString().slice(0, 10)

    const result = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      // Esquema activo
      const [esquema] = await tx
        .select()
        .from(esquemasComision)
        .where(
          and(
            eq(esquemasComision.tenantId, tenantId),
            eq(esquemasComision.tipoProducto, tipoProducto),
            eq(esquemasComision.activo, true),
            isNull(esquemasComision.deletedAt),
            lte(esquemasComision.fechaInicio, hoy),
            or(isNull(esquemasComision.fechaFin), gte(esquemasComision.fechaFin, hoy)),
          ),
        )
        .orderBy(sql`${esquemasComision.fechaInicio} DESC`)
        .limit(1)

      if (!esquema) throw new Error(`No hay esquema ${tipoProducto} activo`)

      // Matriz
      const [matriz] = await tx
        .select()
        .from(matrizAlianzaProducto)
        .where(
          and(
            eq(matrizAlianzaProducto.tenantId, tenantId),
            eq(matrizAlianzaProducto.afiliadoId, afiliadoId),
            eq(matrizAlianzaProducto.tipoProducto, tipoProducto),
            eq(matrizAlianzaProducto.activo, true),
          ),
        )
        .limit(1)

      // Líder + afiliado nombre para mostrar
      const [af] = await tx.select().from(afiliados).where(eq(afiliados.id, afiliadoId)).limit(1)

      let liderNombre = af?.nombre ?? 'Líder'
      if (matriz?.liderId) {
        const [l] = await tx
          .select({ nombre: lideresAlianza.nombre })
          .from(lideresAlianza)
          .where(eq(lideresAlianza.id, matriz.liderId))
          .limit(1)
        if (l) liderNombre = l.nombre
      }

      return calcular({
        montoVenta,
        enganchePagado,
        esquema: {
          tipoProducto,
          porcentajeTotalCliente: Number(esquema.porcentajeTotalCliente),
          porcentajeOpBmcorp: Number(esquema.porcentajeOpBmcorp),
          porcentajeOpYesyucan: Number(esquema.porcentajeOpYesyucan),
          porcentajeSocioFijoJorge: Number(esquema.porcentajeSocioFijoJorge),
          porcentajeSocioFijoKass: Number(esquema.porcentajeSocioFijoKass),
          porcentajeBolsaComercial: Number(esquema.porcentajeBolsaComercial),
          porcentajeAsesorEstandar: Number(esquema.porcentajeAsesorEstandar),
          porcentajeLiderTope: esquema.porcentajeLiderTope
            ? Number(esquema.porcentajeLiderTope)
            : null,
        },
        matriz: matriz
          ? {
              porcentajeAfiliacion: Number(matriz.porcentajeAfiliacion),
              porcentajeJorgeBolsa: Number(matriz.porcentajeJorgeBolsa),
              porcentajeKassBolsa: Number(matriz.porcentajeKassBolsa),
              porcentajeDianaBolsa: Number(matriz.porcentajeDianaBolsa),
              reglaEspecial: matriz.reglaEspecial,
              liderNombre,
              asesorNombre: null,
              requiereConfig: matriz.requiereConfig,
            }
          : null,
      })
    })

    return { ok: true, data: result }
  } catch (err) {
    console.error('[precalculo action]', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
