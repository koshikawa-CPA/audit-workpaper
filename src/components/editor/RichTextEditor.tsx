'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import { FormulaTableCell } from './FormulaTableCell'
import { FileAttachmentNode } from './FileAttachmentNode'
import { WorkpaperMentionNode } from './WorkpaperMentionNode'
import { createClient } from '@/lib/supabase/client'
import {
  evaluateFormula,
  formatCellValue,
  extractTableCellValues,
  getCellAddressInTable,
  type CellFormat,
} from '@/lib/formulaEngine'
import {
  Bold, Italic, UnderlineIcon, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3,
  Table as TableIcon, Undo, Redo, Minus, Code, Quote, Save, Loader2,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Merge, Scissors, Trash2, Calculator, Paperclip, AtSign, LayoutList,
} from 'lucide-react'

// ─── Document helpers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findParentTable(doc: any, pos: number) {
  const resolved = doc.resolve(pos + 1)
  for (let i = resolved.depth; i >= 0; i--) {
    if (resolved.node(i).type.name === 'table') {
      return { node: resolved.node(i), start: resolved.start(i) - 1 }
    }
  }
  return null
}

function colLabel(index: number): string {
  let label = ''
  let i = index + 1
  while (i > 0) {
    label = String.fromCharCode(65 + ((i - 1) % 26)) + label
    i = Math.floor((i - 1) / 26)
  }
  return label
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  content?: Record<string, unknown> | null
  onChange?: (content: Record<string, unknown>) => void
  onSave?: (content: Record<string, unknown>) => Promise<void>
  readOnly?: boolean
  placeholder?: string
  workpaperId?: string  // for registering uploads in workpaper_files
  projectId?: string    // for @mention search (filters workpapers by project)
}

interface WorkpaperSearchResult {
  id: string
  title: string
  workpaper_number: string
}

const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]

interface CellContextMenu {
  x: number
  y: number
  cellPos: number
  currentFormat: CellFormat
}

interface ColOverlay { left: number; width: number; label: string }
interface RowOverlay { top: number; height: number; label: string }
interface TableOverlayItem {
  top: number
  left: number
  cols: ColOverlay[]
  rows: RowOverlay[]
}

const ROW_NUM_W = 28   // px width for row number column
const COL_HDR_H = 20  // px height for column header row

// ─── Toolbar helpers ─────────────────────────────────────────────────────────

function TBtn({
  onClick, active, disabled, title, children, danger,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-1.5 rounded transition-colors text-xs
        ${danger
          ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
          : active
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }
        disabled:opacity-30 disabled:cursor-not-allowed
      `}
    >
      {children}
    </button>
  )
}

function TDivider() {
  return <div className="w-px h-4 bg-gray-200 mx-0.5 shrink-0" />
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RichTextEditor({
  content,
  onChange,
  onSave,
  readOnly = false,
  placeholder = '内容を入力してください...',
  workpaperId,
  projectId,
}: RichTextEditorProps) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [inTableCell, setInTableCell] = useState(false)
  const [inTable, setInTable] = useState(false)
  const [formulaBarValue, setFormulaBarValue] = useState('')
  const [cellAddress, setCellAddress] = useState('')
  const [cellContextMenu, setCellContextMenu] = useState<CellContextMenu | null>(null)
  const [tableOverlays, setTableOverlays] = useState<TableOverlayItem[]>([])
  const [uploading, setUploading] = useState(false)
  const currentCellPosRef = useRef<number>(-1)
  const isApplyingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Always-current editor ref — avoids stale closure in callbacks
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  // ─── @mention popup state ──────────────────────────────────────────────────
  const [showMentionPopup, setShowMentionPopup] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPopupPos, setMentionPopupPos] = useState<{ x: number; y: number } | null>(null)
  const [allWorkpapers, setAllWorkpapers] = useState<WorkpaperSearchResult[] | null>(null)
  const [mentionResults, setMentionResults] = useState<WorkpaperSearchResult[]>([])
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const mentionPopupRef = useRef<HTMLDivElement>(null)
  // Stable refs for use inside event listeners without stale closures
  const mentionResultsRef = useRef<WorkpaperSearchResult[]>([])
  const selectedMentionIndexRef = useRef(0)
  mentionResultsRef.current = mentionResults
  selectedMentionIndexRef.current = selectedMentionIndex

  // ─── File upload + insert ─────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File) => {
    if (!ACCEPTED_MIME.includes(file.type)) {
      alert(`対応していないファイル形式です。\n対応形式: PDF、Excel、Word、PNG、JPEG`)
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('ファイルサイズは50MB以下にしてください。')
      return
    }

    const ed = editorRef.current
    if (!ed) return

    setUploading(true)
    try {
      const supabase = createClient()

      // Get current user for path namespace
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('ログインが必要です')

      // Upload to Storage: {userId}/{timestamp}_{filename}
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('workpaper-attachments')
        .upload(filePath, file, { contentType: file.type, upsert: false })

      if (uploadError) throw uploadError

      // Register in workpaper_files if workpaperId is available
      let fileId: string | null = null
      if (workpaperId) {
        const res = await fetch(`/api/workpapers/${workpaperId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
          }),
        })
        if (res.ok) {
          const row = await res.json()
          fileId = row.id ?? null
        }
      }

      // Insert FileAttachment node at current cursor position
      ed.chain().focus().insertContent({
        type: 'fileAttachment',
        attrs: {
          fileId,
          filePath,
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
        },
      }).run()

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`アップロードに失敗しました: ${msg}`)
    } finally {
      setUploading(false)
    }
  }, [workpaperId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── @mention: filter results when query/workpapers change ───────────────

  useEffect(() => {
    if (!allWorkpapers) {
      setMentionResults([])
      return
    }
    const q = mentionQuery.toLowerCase()
    const filtered = q
      ? allWorkpapers.filter(
          (w) =>
            w.workpaper_number.toLowerCase().includes(q) ||
            w.title.toLowerCase().includes(q)
        )
      : allWorkpapers
    setMentionResults(filtered.slice(0, 8))
    setSelectedMentionIndex(0)
  }, [allWorkpapers, mentionQuery])

  // ─── @mention: fetch workpapers when popup opens ──────────────────────────

  useEffect(() => {
    if (!showMentionPopup || allWorkpapers !== null) return
    const url = projectId
      ? `/api/workpapers?project_id=${projectId}`
      : '/api/workpapers'
    fetch(url)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setAllWorkpapers(
            data.map((w: WorkpaperSearchResult) => ({
              id: w.id,
              title: w.title,
              workpaper_number: w.workpaper_number,
            }))
          )
        }
      })
      .catch(console.error)
  }, [showMentionPopup, projectId, allWorkpapers])

  // ─── @mention: keyboard navigation (Escape/ArrowUp/Down/Enter) ───────────

  // stable ref so the effect doesn't need insertWorkpaperMention in deps
  const insertMentionRef = useRef<(w: WorkpaperSearchResult) => void>(() => {})

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!showMentionPopup) return
      if (e.key === 'Escape') {
        setShowMentionPopup(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex((i) =>
          Math.min(i + 1, mentionResultsRef.current.length - 1)
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        const item = mentionResultsRef.current[selectedMentionIndexRef.current]
        if (item) {
          e.preventDefault()
          insertMentionRef.current(item)
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showMentionPopup])

  // ─── @mention: close popup on outside click ───────────────────────────────

  useEffect(() => {
    if (!showMentionPopup) return
    function onMouseDown(e: MouseEvent) {
      if (
        mentionPopupRef.current &&
        !mentionPopupRef.current.contains(e.target as Node)
      ) {
        setShowMentionPopup(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showMentionPopup])

  // ─── @mention: insert mention node + save reference ──────────────────────

  const insertWorkpaperMention = useCallback(
    (workpaper: WorkpaperSearchResult) => {
      const ed = editorRef.current
      if (!ed) return

      const { $from } = ed.state.selection
      const textBefore = $from.parent.textBetween(0, $from.parentOffset)
      const atMatch = textBefore.match(/@(\S*)$/)
      const queryLen = atMatch ? atMatch[0].length : 1
      const from = $from.pos - queryLen
      const to = $from.pos
      const label = `${workpaper.workpaper_number} ${workpaper.title}`

      ed.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({ type: 'workpaperMention', attrs: { id: workpaper.id, label } })
        .run()

      setShowMentionPopup(false)

      // Save reference relationship to DB
      if (workpaperId) {
        fetch(`/api/workpapers/${workpaperId}/references`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to_workpaper_id: workpaper.id }),
        }).catch(console.error)
      }
    },
    [workpaperId]
  )
  insertMentionRef.current = insertWorkpaperMention

  // ─── Summary table ────────────────────────────────────────────────────────

  const insertSummaryTable = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    ed.chain()
      .focus()
      .insertContent(
        '<table><thead><tr><th>項目</th><th>金額/数量</th><th>備考</th></tr></thead>' +
          '<tbody><tr><td></td><td></td><td></td></tr></tbody></table>'
      )
      .run()
  }, [])

  // ─── Apply formula from bar ─────────────────────────────────────────────

  const applyFormulaBar = useCallback((value: string) => {
    const ed = editorRef.current
    if (!ed || currentCellPosRef.current < 0) return
    const pos = currentCellPosRef.current
    const cellNode = ed.state.doc.nodeAt(pos)
    if (!cellNode) return

    const isFormula = value.startsWith('=')
    let displayText = value

    if (isFormula) {
      const tableInfo = findParentTable(ed.state.doc, pos)
      if (tableInfo) {
        const cellValues = extractTableCellValues(tableInfo.node)
        const cellAddr = getCellAddressInTable(tableInfo.node, cellNode)
        const rawResult = evaluateFormula(value, cellValues, new Set(), cellAddr)
        displayText = formatCellValue(rawResult, (cellNode.attrs.cellFormat || 'text') as CellFormat)
      }
    }

    isApplyingRef.current = true
    const schema = ed.schema
    const textContent = displayText ? schema.text(displayText) : undefined
    const para = schema.nodes.paragraph.create(null, textContent ? [textContent] : [])
    const newCell = cellNode.type.create(
      { ...cellNode.attrs, formula: isFormula ? value : null },
      para,
    )

    ed
      .chain()
      .command(({ tr, dispatch }) => {
        if (!dispatch) return false
        tr.replaceWith(pos, pos + cellNode.nodeSize, newCell)
        dispatch(tr)
        return true
      })
      .focus()
      .run()

    isApplyingRef.current = false
  }, [])

  // ─── Editor setup ────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      FormulaTableCell,
      FileAttachmentNode,
      WorkpaperMentionNode,
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      if (!isApplyingRef.current && onChange) {
        onChange(e.getJSON() as Record<string, unknown>)
      }
      // @mention detection
      if (!e.isEditable) return
      const { $from } = e.state.selection
      const textBefore = $from.parent.textBetween(0, $from.parentOffset)
      const atMatch = textBefore.match(/@(\S*)$/)
      if (atMatch) {
        const query = atMatch[1]
        setMentionQuery(query)
        setShowMentionPopup(true)
        const coords = e.view.coordsAtPos($from.pos)
        setMentionPopupPos({ x: coords.left, y: coords.bottom + 4 })
      } else {
        setShowMentionPopup(false)
      }
    },
    onSelectionUpdate: ({ editor: e }) => {
      if (isApplyingRef.current) return
      const { $from } = e.state.selection

      let inT = false
      let inTC = false
      let foundCellPos = -1
      let foundAddr = ''

      for (let i = $from.depth; i >= 0; i--) {
        const node = $from.node(i)
        if (node.type.name === 'table') { inT = true }
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          inTC = true
          inT = true
          foundCellPos = $from.before(i)
          const formula = node.attrs.formula as string | null
          const text = node.textContent

          const tableInfo = findParentTable(e.state.doc, foundCellPos)
          if (tableInfo) {
            foundAddr = getCellAddressInTable(tableInfo.node, node)
          }

          setFormulaBarValue(formula ?? text)
          break
        }
      }

      setInTable(inT)
      setInTableCell(inTC)
      currentCellPosRef.current = foundCellPos
      setCellAddress(foundAddr)

      if (!inTC) {
        setFormulaBarValue('')
        setCellAddress('')
      }
    },
    editorProps: {
      attributes: {
        // pt-10 (40px) and pl-10 (40px) give room for the address overlay headers
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] pt-10 pr-4 pb-4 pl-10',
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
          if (readOnly) return false
          const { $from } = view.state.selection
          for (let i = $from.depth; i >= 0; i--) {
            const node = $from.node(i)
            if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
              event.preventDefault()
              const pos = $from.before(i)
              setCellContextMenu({
                x: (event as MouseEvent).clientX,
                y: (event as MouseEvent).clientY,
                cellPos: pos,
                currentFormat: (node.attrs.cellFormat || 'text') as CellFormat,
              })
              return true
            }
          }
          return false
        },
      },
    },
  })

  // ─── Keep editorRef current ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(editorRef as any).current = editor

  // ─── Content sync ────────────────────────────────────────────────────────

  useEffect(() => {
    if (editor && content && !editor.isDestroyed) {
      const currentContent = JSON.stringify(editor.getJSON())
      const newContent = JSON.stringify(content)
      if (currentContent !== newContent) {
        editor.commands.setContent(content)
      }
    }
  }, [editor, content])

  // ─── Save handlers ───────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!editor || !onSave) return
    setSaving(true)
    try {
      await onSave(editor.getJSON() as Record<string, unknown>)
      setLastSaved(new Date())
    } finally {
      setSaving(false)
    }
  }, [editor, onSave])

  useEffect(() => {
    if (!onSave || readOnly) return
    const interval = setInterval(handleSave, 30000)
    return () => clearInterval(interval)
  }, [handleSave, onSave, readOnly])

  // ─── Formula bar Enter handler ───────────────────────────────────────────

  function handleFormulaBarKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyFormulaBar(formulaBarValue)
    }
    if (e.key === 'Escape') {
      editor?.commands.focus()
    }
  }

  // ─── Cell format handler ─────────────────────────────────────────────────

  function applyCellFormat(pos: number, format: CellFormat) {
    if (!editor) return
    const cellNode = editor.state.doc.nodeAt(pos)
    if (!cellNode) return

    const formula = cellNode.attrs.formula as string | null
    let newText = cellNode.textContent

    if (formula) {
      const tableInfo = findParentTable(editor.state.doc, pos)
      if (tableInfo) {
        const cellValues = extractTableCellValues(tableInfo.node)
        const cellAddr = getCellAddressInTable(tableInfo.node, cellNode)
        const raw = evaluateFormula(formula, cellValues, new Set(), cellAddr)
        newText = formatCellValue(raw, format)
      }
    }

    isApplyingRef.current = true
    const schema = editor.schema
    const textContent = newText ? schema.text(newText) : undefined
    const para = schema.nodes.paragraph.create(null, textContent ? [textContent] : [])
    const newCell = cellNode.type.create(
      { ...cellNode.attrs, cellFormat: format },
      para,
    )
    editor
      .chain()
      .command(({ tr, dispatch }) => {
        if (!dispatch) return false
        tr.replaceWith(pos, pos + cellNode.nodeSize, newCell)
        dispatch(tr)
        return true
      })
      .focus()
      .run()
    isApplyingRef.current = false
  }

  // ─── Close cell context menu ─────────────────────────────────────────────

  useEffect(() => {
    function handler() { setCellContextMenu(null) }
    if (cellContextMenu) {
      window.addEventListener('click', handler)
      return () => window.removeEventListener('click', handler)
    }
  }, [cellContextMenu])

  // ─── Drag & drop file attachment ─────────────────────────────────────────

  useEffect(() => {
    if (readOnly) return
    const scroll = scrollRef.current
    if (!scroll) return

    function onDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types.includes('Files')) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      scroll!.classList.add('ring-2', 'ring-blue-400', 'ring-inset')
    }
    function onDragLeave() {
      scroll!.classList.remove('ring-2', 'ring-blue-400', 'ring-inset')
    }
    function onDrop(e: DragEvent) {
      scroll!.classList.remove('ring-2', 'ring-blue-400', 'ring-inset')
      if (!e.dataTransfer?.files.length) return
      e.preventDefault()
      Array.from(e.dataTransfer.files).forEach(uploadFile)
    }

    scroll.addEventListener('dragover', onDragOver)
    scroll.addEventListener('dragleave', onDragLeave)
    scroll.addEventListener('drop', onDrop)
    return () => {
      scroll.removeEventListener('dragover', onDragOver)
      scroll.removeEventListener('dragleave', onDragLeave)
      scroll.removeEventListener('drop', onDrop)
    }
  }, [readOnly, uploadFile])

  // ─── Table address overlay ────────────────────────────────────────────────
  // Uses TipTap's own update events + RAF debounce — NO MutationObserver/ResizeObserver
  // to prevent infinite update loops.

  useEffect(() => {
    if (!editor) return
    const scroll = scrollRef.current
    if (!scroll) return

    let rafId: number | null = null

    function scheduleCompute() {
      if (rafId !== null) return  // already queued, skip
      rafId = requestAnimationFrame(() => {
        rafId = null
        computeOverlays()
      })
    }

    function computeOverlays() {
      if (!scroll) return
      const scrollRect = scroll.getBoundingClientRect()
      const tables = scroll.querySelectorAll('.ProseMirror table')
      const result: TableOverlayItem[] = []

      tables.forEach(table => {
        const rows = table.querySelectorAll('tr')
        if (rows.length === 0) return

        const cols: ColOverlay[] = []
        const rowList: RowOverlay[] = []

        // Build per-column positions by scanning ALL rows and accounting for
        // colspan. Row 1 may have merged cells so its cell count < true column
        // count; rows below fill in the gaps.
        const colMap = new Map<number, { left: number; width: number }>()
        Array.from(rows).forEach(row => {
          let colIdx = 0
          Array.from(row.querySelectorAll('td, th')).forEach(cell => {
            const span = (cell as HTMLTableCellElement).colSpan || 1
            if (!colMap.has(colIdx)) {
              const r = cell.getBoundingClientRect()
              const perW = r.width / span
              for (let s = 0; s < span; s++) {
                if (!colMap.has(colIdx + s)) {
                  colMap.set(colIdx + s, {
                    left: r.left - scrollRect.left + scroll.scrollLeft + s * perW,
                    width: perW,
                  })
                }
              }
            }
            colIdx += span
          })
        })
        Array.from(colMap.entries())
          .sort((a, b) => a[0] - b[0])
          .slice(0, 16)
          .forEach(([i, pos]) => {
            cols.push({ ...pos, label: colLabel(i) })
          })

        Array.from(rows).slice(0, 36).forEach((row, i) => {
          const r = row.getBoundingClientRect()
          rowList.push({
            top: r.top - scrollRect.top + scroll.scrollTop,
            height: r.height,
            label: String(i + 1),
          })
        })

        const tRect = table.getBoundingClientRect()
        result.push({
          top: tRect.top - scrollRect.top + scroll.scrollTop,
          left: tRect.left - scrollRect.left + scroll.scrollLeft,
          cols,
          rows: rowList,
        })
      })

      setTableOverlays(result)
    }

    // Trigger on content changes (structural: row/col add/delete)
    editor.on('update', scheduleCompute)
    // Trigger on scroll
    scroll.addEventListener('scroll', scheduleCompute, { passive: true })
    // Trigger on window resize (column widths can change)
    window.addEventListener('resize', scheduleCompute)

    // Initial computation
    scheduleCompute()

    return () => {
      editor.off('update', scheduleCompute)
      scroll.removeEventListener('scroll', scheduleCompute)
      window.removeEventListener('resize', scheduleCompute)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [editor])

  if (!editor) return null

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white">

      {/* ── Main toolbar ── */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 shrink-0">
          <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="元に戻す">
            <Undo className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="やり直す">
            <Redo className="h-3.5 w-3.5" />
          </TBtn>

          <TDivider />

          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="見出し1">
            <Heading1 className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="見出し2">
            <Heading2 className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="見出し3">
            <Heading3 className="h-3.5 w-3.5" />
          </TBtn>

          <TDivider />

          <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="太字">
            <Bold className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="斜体">
            <Italic className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="下線">
            <UnderlineIcon className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="取り消し線">
            <Strikethrough className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="コード">
            <Code className="h-3.5 w-3.5" />
          </TBtn>

          <TDivider />

          <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="箇条書き">
            <List className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="番号付きリスト">
            <ListOrdered className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="引用">
            <Quote className="h-3.5 w-3.5" />
          </TBtn>

          <TDivider />

          <TBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="左寄せ">
            <AlignLeft className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="中央寄せ">
            <AlignCenter className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="右寄せ">
            <AlignRight className="h-3.5 w-3.5" />
          </TBtn>

          <TDivider />

          <TBtn
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 4, withHeaderRow: true }).run()}
            active={editor.isActive('table')}
            title="表を挿入"
          >
            <TableIcon className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="水平線">
            <Minus className="h-3.5 w-3.5" />
          </TBtn>

          <TDivider />

          {/* File attachment */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="ファイルを添付（PDF、Excel、Word、画像）"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            {uploading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Paperclip className="h-3.5 w-3.5" />
            }
            添付
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
            multiple
            onChange={e => {
              Array.from(e.target.files ?? []).forEach(uploadFile)
              e.target.value = ''  // reset so same file can be re-selected
            }}
          />

          <TDivider />

          {/* @参照 button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().insertContent('@').run()
            }}
            title="調書を@メンションで参照"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-600 hover:bg-blue-50 transition-colors font-medium"
          >
            <AtSign className="h-3.5 w-3.5" />
            参照
          </button>

          {/* サマリー表 button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertSummaryTable}
            title="サマリーテーブルを挿入（項目・金額/数量・備考）"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LayoutList className="h-3.5 w-3.5" />
            サマリー表
          </button>

          {onSave && (
            <>
              <TDivider />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                保存
              </button>
              {lastSaved && (
                <span className="text-xs text-gray-400 ml-1 shrink-0">
                  {lastSaved.toLocaleTimeString('ja-JP')}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Table toolbar ── */}
      {!readOnly && inTable && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-blue-50 shrink-0">
          <span className="text-xs text-blue-500 font-medium mr-1 shrink-0">表:</span>

          <TBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="左に列を追加">
            <span className="flex items-center gap-0.5 text-xs"><ChevronLeft className="h-3 w-3" />列</span>
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="右に列を追加">
            <span className="flex items-center gap-0.5 text-xs">列<ChevronRight className="h-3 w-3" /></span>
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="列を削除" danger>
            <span className="text-xs">列削除</span>
          </TBtn>

          <TDivider />

          <TBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="上に行を追加">
            <span className="flex items-center gap-0.5 text-xs"><ChevronUp className="h-3 w-3" />行</span>
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="下に行を追加">
            <span className="flex items-center gap-0.5 text-xs">行<ChevronDown className="h-3 w-3" /></span>
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().deleteRow().run()} title="行を削除" danger>
            <span className="text-xs">行削除</span>
          </TBtn>

          <TDivider />

          <TBtn onClick={() => editor.chain().focus().mergeCells().run()} title="セルを結合">
            <span className="flex items-center gap-0.5 text-xs"><Merge className="h-3 w-3" />結合</span>
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().splitCell().run()} title="セルを分割">
            <span className="flex items-center gap-0.5 text-xs"><Scissors className="h-3 w-3" />分割</span>
          </TBtn>

          <TDivider />

          <TBtn onClick={() => editor.chain().focus().deleteTable().run()} title="表を削除" danger>
            <span className="flex items-center gap-0.5 text-xs"><Trash2 className="h-3 w-3" />表削除</span>
          </TBtn>
        </div>
      )}

      {/* ── Formula bar ── */}
      {!readOnly && inTableCell && (
        <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-200 bg-amber-50 shrink-0">
          <span className="text-xs font-mono text-amber-700 font-bold shrink-0 w-8 text-center">{cellAddress || '—'}</span>
          <div className="w-px h-4 bg-amber-200 shrink-0" />
          <Calculator className="h-3 w-3 text-amber-500 shrink-0" />
          <input
            value={formulaBarValue}
            onChange={e => setFormulaBarValue(e.target.value)}
            onKeyDown={handleFormulaBarKeyDown}
            placeholder="値または数式（=A1+B2、=SUM(A1:A3)、=AVERAGE(A1:A3)）を入力してEnter"
            className="flex-1 text-sm font-mono border-0 outline-none bg-transparent text-gray-800 placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={() => applyFormulaBar(formulaBarValue)}
            className="text-xs px-2 py-0.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors shrink-0"
          >
            ✓
          </button>
        </div>
      )}

      {/* ── Editor scroll area with address overlay ── */}
      <div className="flex-1 overflow-auto relative" ref={scrollRef}>

        {/* Address overlay: column headers + row numbers */}
        {tableOverlays.length > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 5 }}
          >
            {tableOverlays.map((overlay, ti) => (
              <div key={ti}>
                {/* Column header row */}
                <div
                  style={{
                    position: 'absolute',
                    top: overlay.top - COL_HDR_H,
                    left: overlay.left - ROW_NUM_W,
                    display: 'flex',
                    height: COL_HDR_H,
                  }}
                >
                  {/* Corner cell */}
                  <div style={{
                    width: ROW_NUM_W,
                    flexShrink: 0,
                    background: '#e5e7eb',
                    border: '1px solid #d1d5db',
                    borderRight: 'none',
                  }} />
                  {overlay.cols.map((col, ci) => (
                    <div
                      key={ci}
                      style={{
                        width: col.width,
                        flexShrink: 0,
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderLeft: ci === 0 ? '1px solid #d1d5db' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#374151',
                        userSelect: 'none',
                        fontFamily: 'monospace',
                      }}
                    >
                      {col.label}
                    </div>
                  ))}
                </div>

                {/* Row number cells */}
                {overlay.rows.map((row, ri) => (
                  <div
                    key={ri}
                    style={{
                      position: 'absolute',
                      top: row.top,
                      left: overlay.left - ROW_NUM_W,
                      width: ROW_NUM_W,
                      height: row.height,
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderTop: ri === 0 ? '1px solid #d1d5db' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#374151',
                      userSelect: 'none',
                      fontFamily: 'monospace',
                    }}
                  >
                    {row.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <EditorContent editor={editor} />
      </div>

      {/* ── @mention popup ── */}
      {showMentionPopup && mentionPopupPos && (
        <div
          ref={mentionPopupRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-72"
          style={{ left: mentionPopupPos.x, top: mentionPopupPos.y }}
        >
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-1.5">
            <AtSign className="h-3 w-3 text-blue-500 shrink-0" />
            <p className="text-xs text-gray-500 truncate">
              {mentionQuery
                ? `「${mentionQuery}」で検索中`
                : '調書番号または調書名で検索'}
            </p>
          </div>
          {allWorkpapers === null ? (
            <div className="px-3 py-3 text-sm text-gray-400 text-center flex items-center justify-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              読み込み中...
            </div>
          ) : mentionResults.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-400 text-center">
              該当する調書がありません
            </div>
          ) : (
            <ul className="max-h-52 overflow-y-auto">
              {mentionResults.map((w, i) => (
                <li key={w.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-baseline gap-1.5 ${
                      i === selectedMentionIndex
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      insertWorkpaperMention(w)
                    }}
                  >
                    <span className="font-mono text-xs text-gray-400 shrink-0">
                      {w.workpaper_number}
                    </span>
                    <span className="truncate">{w.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Cell context menu ── */}
      {cellContextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-44"
          style={{ left: cellContextMenu.x, top: cellContextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-xs text-gray-400 font-medium border-b border-gray-100 mb-1">
            セルの表示形式
          </div>
          {(
            [
              { format: 'text', label: 'テキスト（デフォルト）' },
              { format: 'currency', label: '金額形式（1,000,000）' },
              { format: 'date', label: '日付形式（YYYY/MM/DD）' },
            ] as const
          ).map(({ format, label }) => (
            <button
              key={format}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                cellContextMenu.currentFormat === format
                  ? 'text-blue-700 font-medium bg-blue-50'
                  : 'text-gray-700'
              }`}
              onClick={() => {
                applyCellFormat(cellContextMenu.cellPos, format)
                setCellContextMenu(null)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
