import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { FlujoMes } from '@/lib/services/flujo/flujo.types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50,
    backgroundColor: '#ffffff',
  },
  // Portada
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 12 },
  coverSubtitle: { fontSize: 14, color: '#475569', marginBottom: 8 },
  coverMeta: { fontSize: 11, color: '#94a3b8' },
  coverDivider: { width: 60, height: 3, backgroundColor: '#10b981', marginVertical: 20 },
  // Secciones
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 10,
    borderBottom: '1 solid #e2e8f0',
    paddingBottom: 4,
  },
  // KPI row
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 10,
    border: '1 solid #e2e8f0',
  },
  kpiLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  kpiValueGreen: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#059669' },
  kpiValueRed: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#dc2626' },
  // Table
  table: { border: '1 solid #e2e8f0', borderRadius: 6, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottom: '1 solid #e2e8f0',
    padding: 6,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #f1f5f9', padding: 6 },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1 solid #f1f5f9',
    padding: 6,
    backgroundColor: '#fafafa',
  },
  tableCell: { fontSize: 8, color: '#334155' },
  tableCellRight: { fontSize: 8, color: '#334155', textAlign: 'right' },
  tableCellGreen: {
    fontSize: 8,
    color: '#059669',
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  tableCellRed: { fontSize: 8, color: '#dc2626', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1 solid #e2e8f0',
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: '#94a3b8' },
})

function fmt(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
}

interface Props {
  empresaNombre: string
  tenantNombre?: string
  anio: number
  flujo: FlujoMes[]
  generadoEn: string
}

export function ReporteFlujoDocument({ empresaNombre, anio, flujo, generadoEn }: Props) {
  const totalIngresos = flujo.reduce((s, m) => s + m.ingresos, 0)
  const totalEgresos = flujo.reduce((s, m) => s + m.egresos, 0)
  const totalNeto = totalIngresos - totalEgresos

  return (
    <Document title={`Flujo de Caja ${empresaNombre} ${anio}`} author="SIG Jade" creator="SIG Jade">
      {/* Portada */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.coverTitle}>SIG Jade</Text>
          <View style={styles.coverDivider} />
          <Text style={styles.coverSubtitle}>Reporte de Flujo de Caja</Text>
          <Text style={styles.coverMeta}>
            {empresaNombre} · Año {anio}
          </Text>
          <Text style={{ ...styles.coverMeta, marginTop: 8 }}>Generado: {generadoEn}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>SIG Jade — {empresaNombre}</Text>
          <Text style={styles.footerText}>Página 1</Text>
        </View>
      </Page>

      {/* Contenido */}
      <Page size="A4" style={styles.page}>
        {/* KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen Anual {anio}</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ingresos Totales</Text>
              <Text style={styles.kpiValueGreen}>{fmt(totalIngresos)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Egresos Totales</Text>
              <Text style={styles.kpiValueRed}>{fmt(totalEgresos)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Neto Acumulado</Text>
              <Text style={totalNeto >= 0 ? styles.kpiValueGreen : styles.kpiValueRed}>
                {fmt(totalNeto)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabla mensual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle Mensual</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableHeaderCell, width: '22%' }}>Mes</Text>
              <Text style={{ ...styles.tableHeaderCell, width: '20%', textAlign: 'right' }}>
                Ingresos
              </Text>
              <Text style={{ ...styles.tableHeaderCell, width: '20%', textAlign: 'right' }}>
                Egresos
              </Text>
              <Text style={{ ...styles.tableHeaderCell, width: '18%', textAlign: 'right' }}>
                Neto
              </Text>
              <Text style={{ ...styles.tableHeaderCell, width: '20%', textAlign: 'right' }}>
                Acumulado
              </Text>
            </View>
            {flujo.map((m, i) => (
              <View key={m.mes} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={{ ...styles.tableCell, width: '22%' }}>
                  {m.mesLabel} {m.anio}
                </Text>
                <Text style={{ ...styles.tableCellGreen, width: '20%' }}>{fmt(m.ingresos)}</Text>
                <Text style={{ ...styles.tableCellRed, width: '20%' }}>{fmt(m.egresos)}</Text>
                <Text
                  style={{
                    ...(m.neto >= 0 ? styles.tableCellGreen : styles.tableCellRed),
                    width: '18%',
                  }}
                >
                  {fmt(m.neto)}
                </Text>
                <Text style={{ ...styles.tableCellRight, width: '20%' }}>{fmt(m.acumulado)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            SIG Jade — {empresaNombre} · Flujo de Caja {anio}
          </Text>
          <Text style={styles.footerText}>Generado: {generadoEn} · Página 2</Text>
        </View>
      </Page>
    </Document>
  )
}
