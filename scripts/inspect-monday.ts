/**
 * scripts/inspect-monday.ts
 *
 * One-off exploratory script. Dumps board structure:
 *   - Board name + total items
 *   - Groups (the "tablas" inside the main tab)
 *   - Columns (id, title, type, settings) — for accurate mapping
 *   - Sample 3 items per group with their column values
 *
 * Run:  npx tsx scripts/inspect-monday.ts
 */

import { writeFileSync } from 'node:fs'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local', override: true })
loadEnv({ path: '.env', override: false })

const API = 'https://api.monday.com/v2'
const KEY = process.env.MONDAY_API_KEY
const BOARD_ID = process.env.MONDAY_BOARD_ID

if (!KEY || !BOARD_ID) {
  console.error('❌ Falta MONDAY_API_KEY o MONDAY_BOARD_ID en .env.local')
  process.exit(1)
}

interface Column {
  id: string
  title: string
  type: string
  settings_str: string
}
interface Group {
  id: string
  title: string
  color: string
}
interface ColumnValue {
  id: string
  text: string | null
  value: string | null
}
interface Item {
  id: string
  name: string
  group: { id: string; title: string }
  column_values: ColumnValue[]
}
interface BoardMeta {
  id: string
  name: string
  description: string | null
  state: string
  items_count: number
  columns: Column[]
  groups: Group[]
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: KEY!,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!r.ok) {
    throw new Error(`HTTP ${r.status}: ${await r.text()}`)
  }
  const j = (await r.json()) as { data: T; errors?: { message: string }[] }
  if (j.errors?.length) {
    throw new Error(j.errors.map((e) => e.message).join('; '))
  }
  return j.data
}

async function main() {
  console.log(`\n🔍 Inspeccionando board ${BOARD_ID}…\n`)

  // 1. Board metadata + columns + groups
  const meta = await gql<{ boards: BoardMeta[] }>(
    `query($id: ID!) {
      boards(ids: [$id]) {
        id
        name
        description
        state
        items_count
        columns { id title type settings_str }
        groups { id title color }
      }
    }`,
    { id: BOARD_ID },
  )

  const board = meta.boards[0]
  if (!board) {
    console.error('❌ Board no encontrado')
    process.exit(1)
  }

  console.log(`📋 ${board.name}  (state: ${board.state})`)
  console.log(`   ${board.items_count} items totales\n`)

  console.log(`📁 GRUPOS (${board.groups.length}):`)
  for (const g of board.groups) {
    console.log(`   • ${g.title}  [id: ${g.id}, color: ${g.color}]`)
  }

  console.log(`\n📊 COLUMNAS (${board.columns.length}):`)
  for (const c of board.columns) {
    let settingsBrief = ''
    try {
      const s = JSON.parse(c.settings_str || '{}')
      if (s.labels) {
        const labels = Object.values(s.labels).filter(Boolean)
        if (labels.length) settingsBrief = `  → opciones: [${labels.join(', ')}]`
      }
    } catch {}
    console.log(`   • ${c.title.padEnd(30)} type=${c.type.padEnd(15)} id=${c.id}${settingsBrief}`)
  }

  // 2. Sample 3 items per group
  console.log(`\n🧪 MUESTRA (3 items por grupo):\n`)

  const sampleData = await gql<{ boards: { items_page: { items: Item[] } }[] }>(
    `query($id: ID!) {
      boards(ids: [$id]) {
        items_page(limit: 100) {
          items {
            id
            name
            group { id title }
            column_values { id text value }
          }
        }
      }
    }`,
    { id: BOARD_ID },
  )

  const items = sampleData.boards[0]?.items_page.items ?? []
  const byGroup = new Map<string, Item[]>()
  for (const it of items) {
    const arr = byGroup.get(it.group.title) ?? []
    if (arr.length < 3) arr.push(it)
    byGroup.set(it.group.title, arr)
  }

  for (const [groupTitle, samples] of byGroup) {
    console.log(`── ${groupTitle} ──`)
    for (const it of samples) {
      console.log(`  ▸ ${it.name}  [item ${it.id}]`)
      for (const cv of it.column_values) {
        if (cv.text || cv.value) {
          const col = board.columns.find((c) => c.id === cv.id)
          const title = col?.title ?? cv.id
          const display = cv.text || cv.value || ''
          console.log(`      ${title.padEnd(28)}: ${display.slice(0, 80)}`)
        }
      }
      console.log('')
    }
  }

  // 3. Save full dump to JSON for offline analysis
  const outFile = 'monday-inspection.json'
  writeFileSync(
    outFile,
    JSON.stringify(
      {
        board: {
          id: board.id,
          name: board.name,
          state: board.state,
          items_count: board.items_count,
        },
        groups: board.groups,
        columns: board.columns.map((c) => ({
          id: c.id,
          title: c.title,
          type: c.type,
          settings: c.settings_str ? JSON.parse(c.settings_str) : null,
        })),
        sampleItems: items.slice(0, 20),
      },
      null,
      2,
    ),
  )
  console.log(`💾 Dump completo guardado en ${outFile}\n`)
}

main().catch((e) => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
