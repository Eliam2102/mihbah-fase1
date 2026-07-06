'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  triggerSync,
  triggerSyncMultiple,
  getWorkspaceBoardsAction,
  type TriggerSyncResult,
  type TriggerSyncAllResult,
} from '@/app/actions/monday-sync'
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  empresaId: string
  /** IDs de tableros que ya tienen al menos un sync COMPLETADO en DB */
  syncedBoardIds?: string[]
}

interface BoardSummary {
  id: string
  name: string
  boardKind: string
  state: string
  updatedAt: string | null
}

// Board de ventas 2026 — único formato homologado. Es el default de sync.
function is2026Board(name: string) {
  return /^ventas?\s+2026$/.test(name.toLowerCase().trim())
}

// Boards de ventas históricos (2020-2025) — NO homologados. Disponibles pero
// no preseleccionados: solo entran si el usuario los marca a propósito.
function isHistoricoVentasBoard(name: string) {
  return /^ventas?\s+202[0-5]$/.test(name.toLowerCase().trim())
}

// Cualquier board de ventas (para agrupar). Incluye "Seguimiento General".
function isVentasBoard(name: string) {
  const normalized = name.toLowerCase().trim()
  if (normalized === 'seguimiento general') return true
  return /^ventas?\s+(202[0-6])$/.test(normalized)
}

function isSeguimientoBoard(name: string, id: string) {
  return id === '3017199126' || name.toLowerCase().trim() === 'seguimiento general'
}

export function MondaySyncButton({ empresaId, syncedBoardIds = [] }: Props) {
  // Memoizar syncedSet para no recalcular en cada render
  const syncedSet = useMemo(() => new Set(syncedBoardIds), [syncedBoardIds])
  const [loading, setLoading] = useState(false)
  const [loadingBoards, setLoadingBoards] = useState(true)
  const [boards, setBoards] = useState<BoardSummary[]>([])
  // Nada pre-seleccionado — usuario elige explícitamente qué sincronizar
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [singleResult, setSingleResult] = useState<TriggerSyncResult | null>(null)
  const [multiResult, setMultiResult] = useState<TriggerSyncAllResult | null>(null)
  const [boardsError, setBoardsError] = useState<string | null>(null)

  useEffect(() => {
    void loadBoards()
  }, [])

  async function loadBoards() {
    setLoadingBoards(true)
    setBoardsError(null)
    try {
      const res = await getWorkspaceBoardsAction()
      if (res.ok) {
        setBoards(res.boards)
        // Pre-seleccionar siempre el board 2026 (formato homologado, único
        // activo para ventas nuevas) — así el botón "Sincronizar" nunca cae
        // al fallback legado MONDAY_BOARD_ID ("Seguimiento General"), que
        // dejaba fuera ventas nuevas agregadas después del primer sync.
        const preselectIds = res.boards.filter((b) => is2026Board(b.name)).map((b) => b.id)
        setSelectedIds(new Set(preselectIds))
      } else {
        setBoardsError(res.error ?? 'Error desconocido')
      }
    } finally {
      setLoadingBoards(false)
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSync() {
    setLoading(true)
    setSingleResult(null)
    setMultiResult(null)
    try {
      if (selectedIds.size > 0) {
        const res = await triggerSyncMultiple(empresaId, Array.from(selectedIds))
        setMultiResult(res)
      } else {
        const res = await triggerSync(empresaId)
        setSingleResult(res)
      }
    } finally {
      setLoading(false)
    }
  }

  const boards2026 = boards.filter((b) => is2026Board(b.name))
  const historicoBoards = boards.filter((b) => isHistoricoVentasBoard(b.name))
  const boardsSeguimiento = boards.filter((b) => isSeguimientoBoard(b.name, b.id))
  const otherBoards = boards.filter(
    (b) =>
      !is2026Board(b.name) && !isHistoricoVentasBoard(b.name) && !isSeguimientoBoard(b.name, b.id),
  )
  const historicoSeleccionados = historicoBoards.filter((b) => selectedIds.has(b.id)).length

  return (
    <div className="space-y-5">
      {/* ── Board chip selector ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-foreground text-sm font-semibold">
            Selecciona los boards a sincronizar
          </p>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() =>
                setSelectedIds(new Set(boards.filter((b) => is2026Board(b.name)).map((b) => b.id)))
              }
              className="text-primary font-medium hover:underline"
            >
              Solo 2026
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={() =>
                setSelectedIds(
                  new Set(boards.filter((b) => isHistoricoVentasBoard(b.name)).map((b) => b.id)),
                )
              }
              className="text-muted-foreground hover:underline"
            >
              Históricos
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={() => setSelectedIds(new Set(boards.map((b) => b.id)))}
              className="text-muted-foreground hover:underline"
            >
              Todos
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-muted-foreground hover:underline"
            >
              Ninguno
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loadingBoards && (
          <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando boards desde Monday...
          </div>
        )}

        {/* Error state */}
        {boardsError && !loadingBoards && (
          <div className="border-destructive/30 bg-destructive/10 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
            <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-destructive font-medium">No se pudieron cargar los boards</p>
              <p className="text-destructive/80 mt-0.5 text-xs">{boardsError}</p>
              <button onClick={loadBoards} className="text-primary mt-1 text-xs hover:underline">
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Boards as chips — grouped */}
        {!loadingBoards && boards.length > 0 && (
          <div className="space-y-3">
            {/* 2026 — formato homologado (default) */}
            {boards2026.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Homologado — ventas 2026
                </p>
                <div className="flex flex-wrap gap-2">
                  {boards2026.map((b) => (
                    <BoardChip
                      key={b.id}
                      board={b}
                      selected={selectedIds.has(b.id)}
                      synced={syncedSet.has(b.id)}
                      onToggle={() => toggle(b.id)}
                      highlight
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Históricos 2020-2025 — NO homologados */}
            {historicoBoards.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Histórico (no homologado)
                </p>
                <div className="flex flex-wrap gap-2">
                  {historicoBoards.map((b) => (
                    <BoardChip
                      key={b.id}
                      board={b}
                      selected={selectedIds.has(b.id)}
                      synced={syncedSet.has(b.id)}
                      onToggle={() => toggle(b.id)}
                    />
                  ))}
                </div>
                {historicoSeleccionados > 0 && (
                  <div className="border-warning/30 bg-warning/10 text-warning flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px]">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Seleccionaste {historicoSeleccionados} board
                    {historicoSeleccionados === 1 ? '' : 's'} histórico
                    {historicoSeleccionados === 1 ? '' : 's'}. Su formato no está homologado y puede
                    reintroducir ventas/alianzas que ya se limpiaron.
                  </div>
                )}
              </div>
            )}

            {/* Seguimiento General */}
            {boardsSeguimiento.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Seguimiento General
                </p>
                <div className="flex flex-wrap gap-2">
                  {boardsSeguimiento.map((b) => (
                    <BoardChip
                      key={b.id}
                      board={b}
                      selected={selectedIds.has(b.id)}
                      synced={syncedSet.has(b.id)}
                      onToggle={() => toggle(b.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Otros boards */}
            {false && otherBoards.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                  Otros boards
                </p>
                <div className="flex flex-wrap gap-2">
                  {otherBoards.map((b) => (
                    <BoardChip
                      key={b.id}
                      board={b}
                      selected={selectedIds.has(b.id)}
                      synced={syncedSet.has(b.id)}
                      onToggle={() => toggle(b.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selection summary */}
        {!loadingBoards && selectedIds.size > 0 && (
          <p className="text-muted-foreground text-xs">
            <span className="text-primary font-semibold">{selectedIds.size}</span> board
            {selectedIds.size === 1 ? '' : 's'} seleccionado{selectedIds.size === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {/* ── Sync button ─────────────────────────────────────────────── */}
      <button
        id="btn-monday-sync"
        onClick={handleSync}
        disabled={loading || loadingBoards}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all',
          loading || loadingBoards
            ? 'bg-primary/60 text-primary-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
        )}
      >
        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        {loading
          ? 'Sincronizando…'
          : selectedIds.size > 0
            ? `Sincronizar ${selectedIds.size} board${selectedIds.size === 1 ? '' : 's'}`
            : 'Sincronizar board principal'}
      </button>

      {/* ── Results ─────────────────────────────────────────────────── */}
      {singleResult && <ResultSingle result={singleResult} />}
      {multiResult && <ResultMulti result={multiResult} />}
    </div>
  )
}

// ── Board chip ─────────────────────────────────────────────────────────────────

function BoardChip({
  board,
  selected,
  synced = false,
  onToggle,
  highlight = false,
}: {
  board: BoardSummary
  selected: boolean
  synced?: boolean
  onToggle: () => void
  highlight?: boolean
}) {
  return (
    <button
      onClick={onToggle}
      title={synced ? 'Ya sincronizado — click para re-sincronizar' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
        selected
          ? highlight
            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
            : 'border-primary/60 bg-primary/10 text-primary'
          : synced
            ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400'
            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {selected && <Check className="h-3 w-3 shrink-0" />}
      {!selected && synced && <CheckCircle className="h-3 w-3 shrink-0 text-emerald-500" />}
      {board.name}
    </button>
  )
}

// ── Result displays ────────────────────────────────────────────────────────────

function ResultSingle({ result }: { result: TriggerSyncResult }) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 text-sm',
        result.ok ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/10',
      )}
    >
      {result.ok ? (
        <div className="space-y-3">
          <div className="text-success flex items-center gap-2 font-semibold">
            <CheckCircle className="h-4 w-4" />
            {result.boardName} — completado
          </div>
          <StatGrid
            stats={[
              { label: 'Total', value: result.totalItems ?? 0, color: 'text-foreground' },
              { label: 'Creados', value: result.creados ?? 0, color: 'text-success' },
              { label: 'Actualizados', value: result.actualizados ?? 0, color: 'text-info' },
              { label: 'Errores', value: result.errores ?? 0, color: 'text-destructive' },
            ]}
          />
          {(result.duration ?? 0) > 0 && (
            <p className="text-muted-foreground text-xs">
              {((result.duration ?? 0) / 1000).toFixed(1)}s
            </p>
          )}
        </div>
      ) : (
        <div className="text-destructive flex items-start gap-2">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Error en sincronización</p>
            <p className="mt-0.5 text-xs opacity-80">{result.error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultMulti({ result }: { result: TriggerSyncAllResult }) {
  if (!result.ok) {
    return (
      <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-4 text-sm">
        <XCircle className="h-4 w-4 shrink-0" />
        {result.error}
      </div>
    )
  }

  const totalItems = result.boards.reduce((s, b) => s + b.totalItems, 0)

  return (
    <div className="border-success/30 bg-success/5 space-y-4 rounded-xl border p-4 text-sm">
      <div className="text-success flex items-center gap-2 font-semibold">
        <CheckCircle className="h-4 w-4" />
        {result.boards.length} board{result.boards.length === 1 ? '' : 's'} sincronizados
      </div>

      <StatGrid
        stats={[
          { label: 'Total items', value: totalItems, color: 'text-foreground' },
          { label: 'Creados', value: result.totalCreados, color: 'text-success' },
          { label: 'Actualizados', value: result.totalActualizados, color: 'text-info' },
          { label: 'Errores', value: result.totalErrores, color: 'text-destructive' },
        ]}
      />

      {/* Per-board detail as compact chips */}
      <div className="space-y-1.5 border-t pt-3">
        <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
          Detalle
        </p>
        {result.boards.map((b) => (
          <div key={b.boardId} className="flex items-center justify-between gap-3 py-0.5 text-xs">
            <span
              className={cn(
                'flex items-center gap-1.5 font-medium',
                b.error ? 'text-destructive' : 'text-foreground',
              )}
            >
              {b.error ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <CheckCircle className="text-success h-3.5 w-3.5 shrink-0" />
              )}
              {b.boardName}
            </span>
            {b.error ? (
              <span className="text-destructive/80 max-w-40 truncate">{b.error}</span>
            ) : (
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {b.totalItems} items &nbsp;·&nbsp;
                <span className="text-success">+{b.creados}</span>
                &nbsp;·&nbsp;
                <span className="text-info">↺{b.actualizados}</span>
                {b.errores > 0 && <span className="text-destructive"> · {b.errores} err</span>}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatGrid({ stats }: { stats: { label: string; value: number; color: string }[] }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          <p className="text-muted-foreground text-xs">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
