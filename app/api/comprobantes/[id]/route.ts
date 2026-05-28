import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { comprobantesPago, usuariosPortal } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireUser } from '@/lib/auth/helpers'
import { leerComprobante } from '@/lib/storage/comprobantes'
import { setTenant } from '@/lib/services/_shared/db.helpers'

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
        // Verificar que pertenezca al usuario
        const portalUsers = await tx
          .select()
          .from(usuariosPortal)
          .where(eq(usuariosPortal.userId, user.id))
        if (portalUsers.length === 0) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
        }

        const isOwner = portalUsers.some(
          (pu) =>
            (pu.liderId && pu.liderId === comprobante.liderId) ||
            (pu.asesorId && pu.asesorId === comprobante.asesorId),
        )

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
