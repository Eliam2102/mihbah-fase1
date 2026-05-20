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
  HelpCircle,
} from 'lucide-react'

export const metadata = { title: 'Guía · Comisiones' }

export default async function GuiaPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <Link
        href={`/empresa/${empresaId}/comisiones`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" /> Volver a Comisiones
      </Link>

      <div>
        <h1 className="text-foreground text-2xl font-bold">Guía del módulo</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cómo funciona, qué hacer la primera vez y el flujo del día a día.
        </p>
      </div>

      {/* Flujo + Setup lado a lado en pantallas grandes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-foreground mb-3 text-base font-semibold">El flujo</h2>
          <div className="bg-card rounded-lg border p-4">
            <ol className="space-y-3">
              <Paso
                num={1}
                icon={<RefreshCw className="h-4 w-4" />}
                titulo="Venta entra desde Monday"
                desc="Cuando Carlita registra una venta en Monday, la sincronización la trae a SIG Jade."
              />
              <Paso
                num={2}
                icon={<Calculator className="h-4 w-4" />}
                titulo="Motor calcula la comisión"
                desc="Automático: aplica % del esquema (TERRENOS 20% / YCD 15%) y la matriz de la alianza. Genera 4-9 líneas de dispersión."
              />
              <Paso
                num={3}
                icon={<Wallet className="h-4 w-4" />}
                titulo="Tú marcas pagos"
                desc="Cuando pagas a un beneficiario (líder, asesor, socio), marcas la dispersión como pagada con fecha y monto."
              />
              <Paso
                num={4}
                icon={<FileText className="h-4 w-4" />}
                titulo="Subes comprobante"
                desc="(Próximamente storage real) Subes PDF o foto del comprobante. Líder/asesor lo descarga del portal."
              />
              <Paso
                num={5}
                icon={<CheckCircle2 className="h-4 w-4" />}
                titulo="Líderes y asesores ven en portal"
                desc="Cada uno entra a /portal/login con su cuenta y ve solo sus comisiones."
              />
            </ol>
          </div>
        </section>

        <section>
          <h2 className="text-foreground mb-3 text-base font-semibold">Primera vez (setup)</h2>
          <div className="bg-card divide-y rounded-lg border">
            <ChecklistItem
              num={1}
              titulo="Verifica esquemas globales"
              desc="Hay 2 fijos: TERRENOS 20% y YCD 15%. Vienen del seed."
              link={`/empresa/${empresaId}/comisiones/esquemas`}
              cta="Ver esquemas"
            />
            <ChecklistItem
              num={2}
              titulo="Asigna líderes a cada alianza"
              desc="Para las 15 alianzas, crea su líder (nombre, email, banco)."
              link={`/empresa/${empresaId}/comisiones/alianzas`}
              cta="Ir a alianzas"
            />
            <ChecklistItem
              num={3}
              titulo="Registra asesores bajo cada líder"
              desc="Asesores son los que cierran ventas. Cada uno bajo su líder. Captura 'mondayNombre' para que el sistema cruce automático."
              link={`/empresa/${empresaId}/comisiones/alianzas`}
              cta="Ir a alianzas"
            />
            <ChecklistItem
              num={4}
              titulo="Configura matriz por alianza"
              desc="Para cada alianza, captura cómo se reparte la bolsa comercial: % afiliación líder + % Jorge bolsa + % Kass bolsa + % Diana bolsa. La suma debe ser exacta (15% terrenos, 12% YCD)."
              link={`/empresa/${empresaId}/comisiones/alianzas`}
              cta="Configurar"
            />
            <ChecklistItem
              num={5}
              titulo="Crea cuentas del portal"
              desc="Para líderes y asesores que quieran ver sus comisiones online. Usa email + password temporal."
              link={`/empresa/${empresaId}/comisiones/portal-usuarios`}
              cta="Crear cuentas"
            />
            <ChecklistItem
              num={6}
              titulo="Sincroniza Monday"
              desc="Trae las ventas históricas. El motor las calcula todas automáticamente."
              link={`/empresa/${empresaId}/monday`}
              cta="Sincronizar"
            />
          </div>
        </section>
      </div>

      {/* Día a día + Mensual + Troubleshooting en 3 columnas en XL */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <section>
          <h2 className="text-foreground mb-3 text-base font-semibold">Día a día</h2>
          <ul className="space-y-2 text-sm">
            <Diario
              icon={<RefreshCw className="h-4 w-4" />}
              texto="Cuando Carlita avise nuevas ventas → click 'Sincronizar Monday'"
            />
            <Diario
              icon={<Wallet className="h-4 w-4" />}
              texto="Cuando vas a pagar → ir a 'Dispersiones', filtrar 'Solo pendientes', click 'Marcar' por cada pago"
            />
            <Diario
              icon={<Calculator className="h-4 w-4" />}
              texto="Si quieres simular antes (cambio de % o caso especial) → usar 'Precálculo'"
            />
            <Diario
              icon={<AlertTriangle className="h-4 w-4" />}
              texto="Si una venta marca 'SIN_CONFIG' → la alianza no tiene matriz configurada. Ir a 'Alianzas' y configurarla."
            />
          </ul>
        </section>

        <section>
          <h2 className="text-foreground mb-3 text-base font-semibold">
            Captura mensual / trimestral
          </h2>
          <ul className="space-y-2 text-sm">
            <Diario
              icon={<CheckCircle2 className="h-4 w-4" />}
              texto="Mes: paga las dispersiones con flag 'acumulaMensual' (Jorge bolsa, casos LGI YCD)"
            />
            <Diario
              icon={<Percent className="h-4 w-4" />}
              texto="Mes: paga los socios fijos (1.5% Jorge + 1.5% Kass en terrenos)"
            />
            <Diario
              icon={<Users className="h-4 w-4" />}
              texto="Trimestre: captura NPS interno por empresa"
            />
          </ul>
        </section>

        <section>
          <h2 className="text-foreground mb-3 text-base font-semibold">Si algo no funciona</h2>
          <ul className="space-y-2 text-sm">
            <Diario
              icon={<AlertTriangle className="h-4 w-4" />}
              texto="Cálculo no cuadra con reporte oficial → revisa % en matriz de la alianza vs doc YESYUCAN v5"
            />
            <Diario
              icon={<AlertTriangle className="h-4 w-4" />}
              texto="Líder no entra al portal → verifica usuario activo en /portal-usuarios y rol lider_alianza"
            />
            <Diario
              icon={<AlertTriangle className="h-4 w-4" />}
              texto="Para todo lo demás → revisa docs/comisiones-operativo.md"
            />
          </ul>
        </section>
      </div>

      {/* Conceptos — grid 2-3 col según pantalla */}
      <section>
        <h2 className="text-foreground mb-3 text-base font-semibold">Conceptos clave</h2>
        <dl className="3xl:grid-cols-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Concepto
            term="Esquema global"
            def="Plantilla del % total. Hay 2: TERRENOS (20%) y YCD (15%). Igual para todas las alianzas."
          />
          <Concepto
            term="Matriz alianza × producto"
            def="Por cada alianza y tipo de producto, define cómo se reparte la bolsa comercial entre líder y socios."
          />
          <Concepto
            term="Bolsa comercial"
            def="Parte de la comisión que se reparte entre líder y socios (Jorge, Kass, Diana). 15% en terrenos, 12% en YCD."
          />
          <Concepto
            term="% Afiliación"
            def="Lo que recibe el líder de la bolsa comercial. De ahí paga al asesor su comisión estándar (8% terrenos / 7% YCD) y se queda con el saldo."
          />
          <Concepto
            term="Dispersión"
            def="Una línea de pago a un beneficiario específico. Por cada venta hay 4 a 9 dispersiones."
          />
          <Concepto
            term="Liberable"
            def="Cuánto de la comisión se puede pagar HOY con el enganche que ya pagó el cliente."
          />
          <Concepto
            term="Diferido"
            def="Lo que aún no se libera porque el cliente no ha pagado suficiente. Se libera cuando paga sus mensualidades."
          />
          <Concepto
            term="Acumula mensual"
            def="La dispersión NO se paga al momento. Se acumula para pagar 1 vez al mes (caso de Jorge bolsa)."
          />
          <Concepto
            term="Regla Flamingo"
            def="YESYUCAN paga directo al asesor, sin pasar por Diana (su líder)."
          />
          <Concepto
            term="Regla LGI YCD acumula"
            def="Comisiones YCD de LGI no se pagan inmediato. Kass define dispersión al inicio del mes siguiente."
          />
          <Concepto
            term="Sin config"
            def="Comisión calculada pero falta configurar la matriz de la alianza. El motor no procesa hasta que Joana configure."
          />
        </dl>
      </section>

      <div className="bg-muted/30 text-muted-foreground flex items-start gap-2 rounded-lg border p-3 text-xs">
        <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Esta guía es resumen visual. Manual completo en{' '}
          <code className="bg-card rounded px-1 py-0.5">docs/comisiones-operativo.md</code>.
        </p>
      </div>
    </section>
  )
}

function Paso({
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
    <li className="flex gap-3">
      <div className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
        {num}
      </div>
      <div>
        <p className="text-foreground inline-flex items-center gap-1.5 text-sm font-medium">
          {icon} {titulo}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">{desc}</p>
      </div>
    </li>
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
    <div className="flex items-start gap-3 p-4">
      <div className="bg-muted text-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
        {num}
      </div>
      <div className="flex-1">
        <p className="text-foreground text-sm font-medium">{titulo}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{desc}</p>
      </div>
      <Link
        href={link}
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs"
      >
        {cta}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

function Diario({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <li className="bg-card flex items-start gap-2 rounded-md border p-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <span className="text-foreground text-sm">{texto}</span>
    </li>
  )
}

function Concepto({ term, def }: { term: string; def: string }) {
  return (
    <div className="bg-card rounded-lg border p-3">
      <dt className="text-foreground text-sm font-semibold">{term}</dt>
      <dd className="text-muted-foreground mt-0.5 text-xs">{def}</dd>
    </div>
  )
}
