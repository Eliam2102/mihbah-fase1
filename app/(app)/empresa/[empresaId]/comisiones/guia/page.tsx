import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Calculator,
  Wallet,
  CheckCircle2,
  FileText,
  Users,
  Percent,
  AlertTriangle,
  BookOpen,
  Sparkles,
  ChevronDown,
  Smile,
} from 'lucide-react'

export const metadata = { title: 'Guía · Comisiones' }

export default async function GuiaPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const base = `/empresa/${empresaId}/comisiones`

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <Link
        href={base}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" /> Comisiones
      </Link>

      {/* Hero */}
      <div className="from-jade-700 via-jade-800 to-jade-900 relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-sm sm:p-8">
        <div className="bg-jade-400/20 absolute -top-12 -right-12 h-48 w-48 rounded-full blur-3xl" />
        <div className="relative">
          <div className="text-jade-100 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <BookOpen className="h-3.5 w-3.5" />
            Centro de ayuda
          </div>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Guía del módulo de comisiones</h1>
          <p className="text-jade-50/90 mt-2 max-w-2xl text-sm sm:text-base">
            Cómo opera el módulo paso a paso, qué hacer cada día y dónde encontrar lo que necesitas.
          </p>
        </div>
      </div>

      {/* Flujo completo — visual horizontal */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="text-primary h-4 w-4" />
          <h2 className="text-foreground text-base font-semibold">Cómo funciona el módulo</h2>
        </div>
        <div className="bg-card rounded-xl border p-4 sm:p-5">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <PasoFlujo
              num={1}
              icon={<RefreshCw className="h-4 w-4" />}
              titulo="Venta entra"
              desc="Se sincroniza desde Monday"
            />
            <PasoFlujo
              num={2}
              icon={<Calculator className="h-4 w-4" />}
              titulo="Sistema calcula"
              desc="Aplica % de matriz automático"
            />
            <PasoFlujo
              num={3}
              icon={<Wallet className="h-4 w-4" />}
              titulo="Marcas pagos"
              desc="Cuando transfieres a un beneficiario"
            />
            <PasoFlujo
              num={4}
              icon={<FileText className="h-4 w-4" />}
              titulo="Subes comprobante"
              desc="PDF o foto del pago"
            />
            <PasoFlujo
              num={5}
              icon={<CheckCircle2 className="h-4 w-4" />}
              titulo="Líder ve portal"
              desc="Acceso externo con su cuenta"
            />
          </ol>
        </div>
      </div>

      {/* 4 secciones colapsables */}
      <div className="space-y-3">
        <h2 className="text-foreground text-base font-semibold">Necesito ayuda con...</h2>

        {/* Setup inicial */}
        <Seccion
          icon={<Sparkles className="h-4 w-4" />}
          color="primary"
          title="Es mi primera vez aquí"
          subtitle="6 pasos para dejar el módulo configurado"
          defaultOpen
        >
          <ol className="divide-y">
            <ChecklistItem
              num={1}
              titulo="Revisa los esquemas globales"
              desc="Hay 2: TERRENOS (20%) y YCD (15%). Vienen cargados, solo verifica que existan."
              link={`${base}/esquemas`}
              cta="Ver esquemas"
            />
            <ChecklistItem
              num={2}
              titulo="Asigna líder a cada alianza"
              desc="Las 16 alianzas necesitan un líder con nombre, correo y datos bancarios."
              link={`${base}/alianzas`}
              cta="Ir a alianzas"
            />
            <ChecklistItem
              num={3}
              titulo="Registra los asesores"
              desc="Cada asesor va bajo un líder. Captura su 'Nombre Monday' para que se cruce automático con las ventas."
              link={`${base}/alianzas`}
              cta="Ir a alianzas"
            />
            <ChecklistItem
              num={4}
              titulo="Configura la matriz de cada alianza"
              desc="Define cómo se reparte la bolsa entre líder, Jorge, Kass y Diana. La suma debe ser exacta (15% Terrenos / 12% YCD)."
              link={`${base}/alianzas`}
              cta="Configurar"
            />
            <ChecklistItem
              num={5}
              titulo="Crea cuentas de portal externo"
              desc="Para líderes y asesores que quieran ver sus comisiones online."
              link={`${base}/portal-usuarios`}
              cta="Crear cuentas"
            />
            <ChecklistItem
              num={6}
              titulo="Sincroniza Monday"
              desc="Trae todas las ventas históricas. El sistema las calcula automático."
              link={`/empresa/${empresaId}/monday`}
              cta="Sincronizar"
            />
          </ol>
        </Seccion>

        {/* Día a día */}
        <Seccion
          icon={<Wallet className="h-4 w-4" />}
          color="success"
          title="Lo que hago cada día"
          subtitle="Operativo recurrente"
        >
          <div className="space-y-2 p-4">
            <Accion
              icon={<RefreshCw className="h-4 w-4" />}
              titulo="Sincronizar Monday"
              desc="Cada vez que entran nuevas ventas. 1 click."
              link={`/empresa/${empresaId}/monday`}
              cta="Ir"
            />
            <Accion
              icon={<Wallet className="h-4 w-4" />}
              titulo="Marcar dispersiones pagadas"
              desc="Después de cada transferencia. Filtra 'Pendientes' y marca."
              link={`${base}/dispersiones`}
              cta="Ir"
            />
            {false && (
              <Accion
                icon={<Calculator className="h-4 w-4" />}
                titulo="Simular antes de pagar (precálculo)"
                desc="Si tienes dudas con un caso, simula sin tocar datos reales."
                link={`${base}/precalculo`}
                cta="Ir"
              />
            )}
            {false && (
              <Accion
                icon={<CheckCircle2 className="h-4 w-4" />}
                titulo="Validar cálculos del sistema"
                desc="Comparar contra el Excel manual. Descargar reporte completo."
                link={`${base}/validacion`}
                cta="Ir"
              />
            )}
          </div>
        </Seccion>

        {/* Mensual / trimestral */}
        <Seccion
          icon={<Smile className="h-4 w-4" />}
          color="info"
          title="Tareas mensuales y trimestrales"
          subtitle="Capturas periódicas"
        >
          <div className="space-y-2 p-4">
            <Accion
              icon={<Percent className="h-4 w-4" />}
              titulo="Revisar niveles de membresía"
              desc="Asignar Jade / Turquesa / Ónix según ventas del periodo."
              link={`${base}/niveles`}
              cta="Ir"
            />
            <Accion
              icon={<Smile className="h-4 w-4" />}
              titulo="Capturar NPS trimestral"
              desc="Cada 3 meses: puntaje, promotores, detractores."
              link={`${base}/nps`}
              cta="Ir"
            />
            <Accion
              icon={<Wallet className="h-4 w-4" />}
              titulo="Pagar acumulados de Jorge bolsa"
              desc="Las dispersiones marcadas 'acumula mensual' se pagan 1 vez al cierre del mes."
              link={`${base}/dispersiones`}
              cta="Ir"
            />
          </div>
        </Seccion>

        {/* Glosario */}
        <Seccion
          icon={<BookOpen className="h-4 w-4" />}
          color="muted"
          title="No entiendo un término"
          subtitle="Glosario de conceptos"
        >
          <dl className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Concepto
              term="Esquema global"
              def="Plantilla del % total de comisión. Hay 2: TERRENOS (20%) y YCD (15%)."
            />
            <Concepto
              term="Matriz alianza × producto"
              def="Define cómo se reparte la bolsa entre líder y socios para cada alianza."
            />
            <Concepto
              term="Bolsa comercial"
              def="Parte de la comisión que va a líder y socios. 15% en Terrenos, 12% en YCD."
            />
            <Concepto
              term="% Afiliación"
              def="Lo que recibe el líder. De ahí paga al asesor (excepto Flamingo, donde paga directo)."
            />
            <Concepto
              term="Dispersión"
              def="Una línea de pago a un beneficiario. Por cada venta hay 4 a 9 dispersiones."
            />
            <Concepto
              term="Liberable"
              def="Cuánto se puede pagar HOY con el enganche que ya cobró el cliente."
            />
            <Concepto
              term="Diferido"
              def="Lo que aún no se libera. Se desbloquea cuando el cliente paga más."
            />
            <Concepto
              term="Acumula mensual"
              def="No se paga al momento. Se acumula y se paga 1 vez al cierre del mes (caso Jorge bolsa)."
            />
            <Concepto
              term="Descuento desarrolladora"
              def="5% que aplica la desarrolladora antes de entregar el pago a BM Corp. Aplica a todos los conceptos."
            />
            <Concepto
              term="Regla Flamingo"
              def="YESYUCAN paga directo al asesor, sin pasar por el líder."
            />
            <Concepto
              term="Regla LGI YCD acumula"
              def="Las comisiones YCD de LGI no se pagan al momento. Se acumulan y Kass define dispersión al inicio del mes siguiente."
            />
            <Concepto
              term="Sin config"
              def="Falta configurar matriz de esa alianza. El sistema marca la venta y no procesa hasta que se configure."
            />
          </dl>
        </Seccion>

        {/* Troubleshooting */}
        <Seccion
          icon={<AlertTriangle className="h-4 w-4" />}
          color="warning"
          title="Algo no me funciona"
          subtitle="Resolución de problemas comunes"
        >
          <div className="space-y-3 p-4">
            {false && (
              <Problema
                problema="El cálculo no cuadra con mi reporte manual"
                solucion="Abre Validación cálculos, descarga el Excel del sistema y compara línea por línea con tu Excel. Si el % difiere, revisa la matriz de esa alianza."
                link={`${base}/validacion`}
                cta="Ir a Validación"
              />
            )}
            <Problema
              problema="Una venta dice 'Sin config'"
              solucion="La alianza no tiene matriz configurada. Ve a Alianzas, abre la alianza, configura los % de Terrenos o YCD según corresponda."
              link={`${base}/alianzas`}
              cta="Ir a Alianzas"
            />
            <Problema
              problema="Un líder no puede entrar al portal"
              solucion="Revisa que su cuenta esté activa en Usuarios de Portal. Verifica que el rol sea lider_alianza y que la contraseña sea la que le compartiste."
              link={`${base}/portal-usuarios`}
              cta="Ir a Portal usuarios"
            />
            <Problema
              problema="Sincronicé Monday pero faltan ventas"
              solucion="Verifica que las ventas en Monday tengan el campo 'Afiliado' y 'Asesor' llenos. El sistema solo trae las que tienen estos datos."
              link={`/empresa/${empresaId}/monday`}
              cta="Ir a Monday"
            />
            <Problema
              problema="El monto del asesor en el portal no coincide"
              solucion="Excepto Flamingo, el asesor cobra del líder. En el sistema el dinero del asesor se consolida en la línea del líder. Para Flamingo sí aparece línea separada."
            />
          </div>
        </Seccion>
      </div>

      {/* Footer con link manual completo */}
      <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-4">
        <BookOpen className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div className="text-sm">
          <p className="text-foreground font-medium">¿Necesitas el manual completo?</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Esta guía es un resumen visual. El manual operativo detallado vive en{' '}
            <code className="bg-card rounded px-1 py-0.5 text-[11px]">
              docs/comisiones-operativo.md
            </code>{' '}
            del repositorio.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function PasoFlujo({
  num,
  icon,
  titulo,
  desc,
}: {
  num: number
  icon: React.ReactNode
  titulo: string
  desc: string
}) {
  return (
    <li className="bg-muted/30 hover:bg-muted/50 relative rounded-lg p-3 transition-colors">
      <div className="text-muted-foreground mb-1.5 flex items-center justify-between">
        <span className="bg-primary text-primary-foreground inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
          {num}
        </span>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="text-foreground text-sm font-semibold">{titulo}</p>
      <p className="text-muted-foreground mt-0.5 text-[11px] leading-tight">{desc}</p>
    </li>
  )
}

function Seccion({
  icon,
  color,
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'info' | 'muted'
  title: string
  subtitle: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
    muted: 'bg-muted text-muted-foreground',
  }

  return (
    <details
      open={defaultOpen}
      className="bg-card group rounded-xl border shadow-sm transition-shadow open:shadow-md"
    >
      <summary className="hover:bg-muted/30 flex cursor-pointer list-none items-center gap-4 rounded-xl p-4 transition-colors">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${colorMap[color]}`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-base font-semibold">{title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
        </div>
        <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t">{children}</div>
    </details>
  )
}

function ChecklistItem({
  num,
  titulo,
  desc,
  link,
  cta,
}: {
  num: number
  titulo: string
  desc: string
  link: string
  cta: string
}) {
  return (
    <li className="flex items-start gap-3 p-4">
      <div className="bg-muted text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
        {num}
      </div>
      <div className="flex-1">
        <p className="text-foreground text-sm font-medium">{titulo}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{desc}</p>
      </div>
      <Link
        href={link}
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium"
      >
        {cta}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  )
}

function Accion({
  icon,
  titulo,
  desc,
  link,
  cta,
}: {
  icon: React.ReactNode
  titulo: string
  desc: string
  link: string
  cta: string
}) {
  return (
    <div className="bg-muted/20 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-3 transition-colors">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{titulo}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{desc}</p>
      </div>
      <Link
        href={link}
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium"
      >
        {cta}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

function Concepto({ term, def }: { term: string; def: string }) {
  return (
    <div className="bg-muted/20 rounded-lg p-3">
      <dt className="text-foreground text-sm font-semibold">{term}</dt>
      <dd className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{def}</dd>
    </div>
  )
}

function Problema({
  problema,
  solucion,
  link,
  cta,
}: {
  problema: string
  solucion: string
  link?: string
  cta?: string
}) {
  return (
    <div className="border-warning/30 bg-warning/5 rounded-lg border p-3">
      <p className="text-foreground inline-flex items-center gap-1.5 text-sm font-medium">
        <AlertTriangle className="text-warning h-3.5 w-3.5 shrink-0" />
        {problema}
      </p>
      <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{solucion}</p>
      {link && cta && (
        <Link
          href={link}
          className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
        >
          {cta}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}
