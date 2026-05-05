/**
 * lib/monday/client.ts
 *
 * Monday.com GraphQL API client.
 * - Uses fetch (no extra deps)
 * - Reads MONDAY_API_KEY from env
 * - Pagination with cursor
 * - Retry with exponential backoff on rate-limit (429) and transient errors
 */

const MONDAY_API_URL = 'https://api.monday.com/v2'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MondayColumnValue {
  id: string
  column: { title: string }
  text: string // human-readable value
  value: string | null // raw JSON value from Monday
  type: string
}

export interface MondayItem {
  id: string
  name: string // "Nombre" column in Monday (item title)
  group: { title: string }
  column_values: MondayColumnValue[]
}

export interface MondayBoard {
  id: string
  name: string
  items_page: {
    cursor: string | null
    items: MondayItem[]
  }
}

interface MondayResponse<T> {
  data: T
  errors?: { message: string; locations?: unknown[] }[]
}

// ─── GraphQL queries ──────────────────────────────────────────────────────────

const BOARD_ITEMS_QUERY = `
  query GetBoardItems($boardId: ID!, $cursor: String, $limit: Int!) {
    boards(ids: [$boardId]) {
      id
      name
      items_page(limit: $limit, cursor: $cursor) {
        cursor
        items {
          id
          name
          group {
            title
          }
          column_values {
            id
            text
            value
            type
            column {
              title
            }
          }
        }
      }
    }
  }
`

// ─── Core fetch with retry ────────────────────────────────────────────────────

async function mondayFetch<T>(
  query: string,
  variables: Record<string, unknown>,
  retryCount = 0,
): Promise<T> {
  const apiKey = process.env.MONDAY_API_KEY
  if (!apiKey) throw new Error('MONDAY_API_KEY no está configurada en las variables de entorno')

  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
  })

  // Rate limit — retry after backoff
  if (response.status === 429 && retryCount < MAX_RETRIES) {
    const retryAfter = Number(response.headers.get('Retry-After') ?? 1)
    const delay = Math.max(retryAfter * 1000, BASE_DELAY_MS * 2 ** retryCount)
    await sleep(delay)
    return mondayFetch<T>(query, variables, retryCount + 1)
  }

  // Transient server errors — retry
  if ((response.status >= 500 || response.status === 408) && retryCount < MAX_RETRIES) {
    await sleep(BASE_DELAY_MS * 2 ** retryCount)
    return mondayFetch<T>(query, variables, retryCount + 1)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new MondayApiError(`HTTP ${response.status}: ${body}`, response.status)
  }

  const json = (await response.json()) as MondayResponse<T>

  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join('; ')
    throw new MondayApiError(`GraphQL error: ${msg}`, 200)
  }

  return json.data
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches ALL items from a Monday.com board using cursor-based pagination.
 * Returns the board metadata + flat array of items.
 */
export async function getBoard(boardId: string): Promise<{ name: string; items: MondayItem[] }> {
  const PAGE_SIZE = 200
  const allItems: MondayItem[] = []
  let cursor: string | null = null
  let boardName = ''

  do {
    const data: { boards: MondayBoard[] } = await mondayFetch<{ boards: MondayBoard[] }>(
      BOARD_ITEMS_QUERY,
      {
        boardId,
        cursor: cursor ?? undefined,
        limit: PAGE_SIZE,
      },
    )

    const board: MondayBoard | undefined = data.boards[0]
    if (!board) throw new MondayApiError(`Board ${boardId} no encontrado`, 404)

    boardName = board.name
    allItems.push(...board.items_page.items)
    cursor = board.items_page.cursor
  } while (cursor)

  return { name: boardName, items: allItems }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MondayApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'MondayApiError'
  }
}

/**
 * Finds a column value by title (case-insensitive partial match).
 * Prefer getColumnById for reliable lookups when the column ID is known —
 * partial title match can hit the wrong column when titles overlap (e.g.
 * "ENGANCHE" formula vs "Porcentaje de enganche" vs "ENGANCHE" status).
 */
export function getColumnByTitle(
  item: MondayItem,
  titleMatch: string,
): MondayColumnValue | undefined {
  const lower = titleMatch.toLowerCase()
  return item.column_values.find((c) => c.column.title.toLowerCase().includes(lower))
}

/**
 * Finds a column value by exact column ID. Use this when the board structure
 * is known (mapped IDs in mappers.ts).
 */
export function getColumnById(item: MondayItem, id: string): MondayColumnValue | undefined {
  return item.column_values.find((c) => c.id === id)
}

/**
 * Parses a Monday date value (ISO string or "YYYY-MM-DD") to a JS Date or null.
 */
export function parseMondayDate(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    // Monday stores dates as JSON: {"date":"2024-01-15","time":null}
    const parsed = JSON.parse(value) as { date?: string }
    return parsed.date ?? null
  } catch {
    // might already be a plain string
    return value.length >= 10 ? value.slice(0, 10) : null
  }
}

/**
 * Parses a Monday numeric/money column to a string suitable for numeric DB column.
 */
export function parseMondayNumber(text: string | null | undefined): string {
  if (!text) return '0'
  // Remove currency symbols, commas, spaces
  const clean = text.replace(/[^0-9.-]/g, '')
  return clean || '0'
}
