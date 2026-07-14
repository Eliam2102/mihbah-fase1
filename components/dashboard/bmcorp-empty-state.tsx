import Link from 'next/link'
import { Cloud, ArrowRight } from 'lucide-react'

interface Props {
  empresaId: string
}

export function BmcorpEmptyState({ empresaId }: Props) {
  return (
    <div className="border-border bg-card flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12 text-center">
      <div className="bg-jade-100 dark:bg-jade-900/30 rounded-full p-4">
        <Cloud className="text-jade-600 h-8 w-8" />
      </div>
      <div>
        <h3 className="text-foreground text-lg font-semibold">Sin datos sincronizados</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          BM CORP recibe sus datos desde Monday.com. Ejecuta la primera sincronización para poblar
          este dashboard.
        </p>
      </div>
      <Link
        href={`/empresa/${empresaId}/monday`}
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
      >
        Ir a Sincronización Monday
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
