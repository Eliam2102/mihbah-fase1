import Link from 'next/link'
import { FolderX } from 'lucide-react'

export default function ProyectoNotFound() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <FolderX className="text-muted-foreground h-12 w-12 opacity-50" />
      <h2 className="text-foreground text-xl font-semibold">Proyecto no encontrado</h2>
      <p className="text-muted-foreground text-sm">
        El proyecto no existe o no tiene movimientos registrados.
      </p>
      <Link
        href=".."
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
      >
        Volver a proyectos
      </Link>
    </section>
  )
}
