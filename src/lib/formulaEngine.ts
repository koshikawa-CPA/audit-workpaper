// ─── Cell address utilities ─────────────────────────────────────────────────

export function getCellAddress(col: number, row: number): string {
  let colStr = ''
  let c = col + 1
  while (c > 0) {
    colStr = String.fromCharCode(65 + ((c - 1) % 26)) + colStr
    c = Math.floor((c - 1) / 26)
  }
  return `${colStr}${row + 1}`
}

export function parseCellAddress(addr: string): { col: number; row: number } | null {
  const match = addr.toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!match) return null
  const colStr = match[1]
  const row = parseInt(match[2], 10) - 1
  let col = 0
  for (const ch of colStr) {
    col = col * 26 + (ch.charCodeAt(0) - 64)
  }
  return { col: col - 1, row }
}

// ─── Formula evaluation ──────────────────────────────────────────────────────

/**
 * rawValues: Map<cellAddr, rawText>  (e.g. "A1" → "=B1+5" or "42")
 * Returns the computed string result, or "#ERR" / "#CIRC"
 */
export function evaluateFormula(
  formula: string,
  rawValues: Map<string, string>,
  visited: Set<string> = new Set(),
  currentAddr: string = '',
): string {
  if (!formula.startsWith('=')) return formula

  const expr = formula.slice(1).trim()

  function resolveNum(addr: string): number {
    const key = addr.toUpperCase()
    if (key === currentAddr.toUpperCase()) throw new Error('CIRC')
    if (visited.has(key)) throw new Error('CIRC')

    const raw = rawValues.get(key) ?? '0'
    if (raw.startsWith('=')) {
      const childVisited = new Set(Array.from(visited).concat(currentAddr.toUpperCase()))
      const result = evaluateFormula(raw, rawValues, childVisited, key)
      if (result === '#CIRC' || result === '#ERR') throw new Error(result.slice(1))
      const n = parseFloat(result)
      return isNaN(n) ? 0 : n
    }
    const n = parseFloat(raw)
    return isNaN(n) ? 0 : n
  }

  try {
    const upper = expr.toUpperCase()

    // SUM(A1:A3)
    const sumMatch = upper.match(/^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/)
    if (sumMatch) {
      const start = parseCellAddress(sumMatch[1])
      const end = parseCellAddress(sumMatch[2])
      if (!start || !end) return '#ERR'
      let sum = 0
      for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
        for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
          sum += resolveNum(getCellAddress(c, r))
        }
      }
      return String(sum)
    }

    // Replace cell references with numeric values
    const cellRefs = upper.match(/\b[A-Z]+\d+\b/g) ?? []
    let resolved = upper
    for (const ref of cellRefs) {
      const val = resolveNum(ref)
      resolved = resolved.replace(new RegExp(`\\b${ref}\\b`, 'g'), String(val))
    }

    // Only allow safe arithmetic
    if (!/^[\d\s+\-*/().]+$/.test(resolved)) return '#ERR'

    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + resolved + ')')() as number
    if (!isFinite(result) || isNaN(result)) return '#ERR'

    // Return integer if whole number, else limit decimals
    return Number.isInteger(result) ? String(result) : String(Math.round(result * 1e10) / 1e10)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'CIRC') return '#CIRC'
    return '#ERR'
  }
}

// ─── Cell value formatting ───────────────────────────────────────────────────

export type CellFormat = 'text' | 'currency' | 'date'

export function formatCellValue(value: string, format: CellFormat): string {
  if (value === '#ERR' || value === '#CIRC') return value

  if (format === 'currency') {
    const num = parseFloat(value)
    if (isNaN(num)) return value
    return num.toLocaleString('ja-JP')
  }

  if (format === 'date') {
    // Try ISO date or numeric
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const dy = String(d.getDate()).padStart(2, '0')
        return `${y}/${m}/${dy}`
      }
    }
    return value
  }

  return value
}

// ─── Extract cell values from TipTap document ───────────────────────────────

interface ProseMirrorNode {
  type: { name: string }
  attrs: Record<string, unknown>
  textContent: string
  nodeSize: number
  forEach: (cb: (node: ProseMirrorNode, offset: number) => void) => void
  nodeAt: (pos: number) => ProseMirrorNode | null
}

export function extractTableCellValues(
  tableNode: ProseMirrorNode,
): Map<string, string> {
  const values = new Map<string, string>()
  let rowIdx = 0
  tableNode.forEach((rowNode) => {
    if (rowNode.type.name !== 'tableRow') return
    let colIdx = 0
    rowNode.forEach((cellNode) => {
      if (cellNode.type.name !== 'tableCell' && cellNode.type.name !== 'tableHeader') return
      const addr = getCellAddress(colIdx, rowIdx)
      const formula = cellNode.attrs.formula as string | null
      const text = cellNode.textContent.trim()
      values.set(addr, formula ?? text)
      colIdx++
    })
    rowIdx++
  })
  return values
}

export function getCellAddressInTable(
  tableNode: ProseMirrorNode,
  targetCellNode: ProseMirrorNode,
): string {
  let foundAddr = 'A1'
  let rowIdx = 0
  tableNode.forEach((rowNode) => {
    if (rowNode.type.name !== 'tableRow') return
    let colIdx = 0
    rowNode.forEach((cellNode) => {
      if (cellNode === targetCellNode) {
        foundAddr = getCellAddress(colIdx, rowIdx)
      }
      colIdx++
    })
    rowIdx++
  })
  return foundAddr
}
