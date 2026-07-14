import { type NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth/helpers'
import { getEmpresaById } from '@/lib/services/empresas'
import { getFlujoMensual } from '@/lib/services/flujo.service'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { ReporteFlujoDocument } from '@/lib/pdf/reporte-flujo'
import React from 'react'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ empresaId: string; tipo: string }> },
) {
  const { empresaId, tipo } = await params
  const user = await requireUser()
  const tenantId = user.tenantId
  if (!tenantId) return new Response('Unauthorized', { status: 401 })

  const empresa = await getEmpresaById(empresaId, tenantId)
  if (!empresa) return new Response('Not found', { status: 404 })

  const anioParam = req.nextUrl.searchParams.get('anio')
  const anio = Number(anioParam) || new Date().getFullYear()
  const generadoEn = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })

  if (tipo === 'flujo') {
    const flujo = await getFlujoMensual(empresaId, tenantId, anio)
    const element = React.createElement(ReporteFlujoDocument, {
      empresaNombre: empresa.name,
      anio,
      flujo,
      generadoEn,
    }) as unknown as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="flujo-caja-${empresa.name}-${anio}.pdf"`,
      },
    })
  }

  return new Response('Tipo de reporte no soportado', { status: 400 })
}
