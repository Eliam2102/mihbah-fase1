import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'node:crypto'

const DIR = process.env.COMPROBANTES_DIR ?? './.uploads/comprobantes'

export async function guardarComprobante(
  file: File,
  tenantId: string,
): Promise<{ rutaArchivo: string; nombre: string; mimeType: string; tamanioBytes: number }> {
  // Valida mime (jpg/png/pdf) y tamaño (≤20MB)
  if (!file.type.match(/image\/(jpeg|png)|application\/pdf/)) {
    throw new Error('Tipo de archivo no permitido. Solo JPG, PNG o PDF.')
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('El archivo excede los 20MB permitidos.')
  }

  const ext = file.name.split('.').pop() || 'bin'
  const nombreGuardado = `${randomUUID()}.${ext}`

  const tenantDir = path.join(DIR, tenantId)
  await fs.mkdir(tenantDir, { recursive: true })

  const rutaArchivo = path.join(tenantDir, nombreGuardado)

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  await fs.writeFile(rutaArchivo, buffer)

  return {
    rutaArchivo,
    nombre: file.name, // Nombre original
    mimeType: file.type,
    tamanioBytes: file.size,
  }
}

export async function leerComprobante(rutaArchivo: string): Promise<Buffer> {
  const fullPath = path.resolve(rutaArchivo)
  const dirPath = path.resolve(DIR)

  // Seguridad: evitar path traversal
  if (!fullPath.startsWith(dirPath)) {
    throw new Error('Acceso denegado a archivo fuera del directorio de comprobantes.')
  }

  return await fs.readFile(fullPath)
}
