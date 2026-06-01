import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { comprobantesPago, usuariosPortal } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireUser } from '@/lib/auth/helpers'
import { leerComprobante } from '@/lib/storage/comprobantes'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { getPerfilPortal } from '@/lib/services/comisiones/portal.service'
import { asesores } from '@/lib/db/schema'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { id: comprobanteId } = await params
    const tenantId = user.tenantId

    return await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      const [comprobante] = await tx
        .select()
        .from(comprobantesPago)
        .where(eq(comprobantesPago.id, comprobanteId))

      if (!comprobante) {
        return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 })
      }

      // Autorización: tesoreria/admin ven todos
      // lider_alianza o asesor solo ven el suyo
      const isAdminOrTesoreria = ['admin', 'super_admin', 'super_admin_dev', 'tesoreria'].includes(
        user.role || '',
      )

      if (!isAdminOrTesoreria) {
        const perfil = await getPerfilPortal(user.id)
        if (!perfil) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        let isOwner = false
        if (perfil.rolPortal === 'ASESOR' && perfil.asesorIds.length > 0) {
          isOwner = comprobante.asesorId !== null && perfil.asesorIds.includes(comprobante.asesorId)
        } else if (['LIDER_ALIANZA', 'ADMINISTRATIVO'].includes(perfil.rolPortal)) {
          if (comprobante.liderId !== null && perfil.liderIds.includes(comprobante.liderId)) {
            isOwner = true
          }
          if (!isOwner && comprobante.asesorId !== null) {
            const [asesor] = await tx
              .select({ liderId: asesores.liderId, afiliadoId: asesores.afiliadoId })
              .from(asesores)
              .where(eq(asesores.id, comprobante.asesorId))
            if (asesor) {
              if (asesor.liderId !== null && perfil.liderIds.includes(asesor.liderId))
                isOwner = true
              else if (asesor.afiliadoId !== null && perfil.alianzasIds.includes(asesor.afiliadoId))
                isOwner = true
            }
          }
        }

        if (!isOwner) {
          return NextResponse.json(
            { error: 'No autorizado para ver este comprobante' },
            { status: 403 },
          )
        }
      }

      const buffer = await leerComprobante(comprobante.rutaArchivo)

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': comprobante.mimeType,
          'Content-Disposition': `inline; filename="${comprobante.nombre}"`,
        },
      })
    })
  } catch (error: unknown) {
    console.error('Error al descargar comprobante:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}
