import XLSX from 'exceljs'

async function main() {
  const wb = new XLSX.Workbook()
  await wb.xlsx.readFile('/Users/macbookeliam/Downloads/directorio líderes.xlsx')
  wb.worksheets.forEach((ws) => {
    console.log(`═══ Sheet: ${ws.name} (filas: ${ws.rowCount}) ═══`)
    ws.eachRow((row, n) => {
      const vals = row.values as unknown[]
      console.log(
        n,
        vals
          .slice(1)
          .map((v) => (v == null ? '' : String(v).slice(0, 60)))
          .join(' | '),
      )
    })
    console.log()
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
