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
  Merge, Scissors, Trash2, Calculator,
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  content?: Record<string, unknown> | null
  onChange?: (content: Record<string, unknown>) => void
  onSave?: (content: Record<string, unknown>) => Promise<void>
  readOnly?: boolean
  placeholder?: string
}

interface CellContextMenu {
  x: number
  y: number
  cellPos: number
  currentFormat: CellFormat
}

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
      // preventDefault on mousedown keeps editor focus so cursor position is preserved
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
}: RichTextEditorProps) {
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [inTableCell, setInTableCell] = useState(false)
  const [inTable, setInTable] = useState(false)
  const [formulaBarValue, setFormulaBarValue] = useState('')
  const [cellAddress, setCellAddress] = useState('')
  const [cellContextMenu, setCellContextMenu] = useState<CellContextMenu | null>(null)
  const currentCellPosRef = useRef<number>(-1)
  const isApplyingRef = useRef(false)

  // ─── Apply formula from bar ─────────────────────────────────────────────

  const applyFormulaBar = useCallback((value: string) => {
    if (!editor || currentCellPosRef.current < 0) return
    const pos = currentCellPosRef.current
    const cellNode = editor.state.doc.nodeAt(pos)
    if (!cellNode) return

    const isFormula = value.startsWith('=')
    let displayText = value

    if (isFormula) {
      const tableInfo = findParentTable(editor.state.doc, pos)
      if (tableInfo) {
        const cellValues = extractTableCellValues(tableInfo.node)
        const cellAddr = getCellAddressInTable(tableInfo.node, cellNode)
        const rawResult = evaluateFormula(value, cellValues, new Set(), cellAddr)
        displayText = formatCellValue(rawResult, (cellNode.attrs.cellFormat || 'text') as CellFormat)
      }
    }

    isApplyingRef.current = true
    const schema = editor.schema
    const textContent = displayText ? schema.text(displayText) : undefined
    const para = schema.nodes.paragraph.create(null, textContent ? [textContent] : [])
    const newCell = cellNode.type.create(
      { ...cellNode.attrs, formula: isFormula ? value : null },
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      if (!isApplyingRef.current && onChange) {
        onChange(e.getJSON() as Record<string, unknown>)
      }
    },
    onSelectionUpdate: ({ editor: e }) => {
      if (isApplyingRef.current) return
      const { $from } = e.state.selection

      // Check if in table
      let inT = false
      let inTC = false
      let foundCellPos = -1
      let foundAddr = ''

      for (let i = $from.depth; i >= 0; i--) {
        const node = $from.node(i)
        if (node.type.name === 'table') { inT = true }
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          inTC = true
          inT = true  // a cell is always inside a table
          foundCellPos = $from.before(i)
          const formula = node.attrs.formula as string | null
          const text = node.textContent

          // Find cell address
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
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
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

    // Re-apply formula with new format if applicable
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

  // ─── Row/column resize cursor ────────────────────────────────────────────

  useEffect(() => {
    if (!editor || readOnly) return
    const dom = editor.view.dom as HTMLElement
    const ROW_BORDER_PX = 6

    function onMouseMove(e: MouseEvent) {
      const target = e.target as HTMLElement
      const cell = target.closest('td, th') as HTMLElement | null
      if (!cell) {
        dom.style.cursor = ''
        return
      }
      const rect = cell.getBoundingClientRect()
      const nearBottom = e.clientY >= rect.bottom - ROW_BORDER_PX
      const nearTop = e.clientY <= rect.top + ROW_BORDER_PX

      if (nearBottom || nearTop) {
        dom.style.cursor = 'row-resize'
      } else {
        // Let TipTap's column-resize-handle handle col-resize via CSS class
        dom.style.cursor = ''
      }
    }

    function onMouseLeave() {
      dom.style.cursor = ''
    }

    dom.addEventListener('mousemove', onMouseMove)
    dom.addEventListener('mouseleave', onMouseLeave)
    return () => {
      dom.removeEventListener('mousemove', onMouseMove)
      dom.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [editor, readOnly])

  if (!editor) return null

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white">

      {/* ── Main toolbar ── */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 shrink-0">
          {/* Undo/Redo */}
          <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="元に戻す">
            <Undo className="h-3.5 w-3.5" />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="やり直す">
            <Redo className="h-3.5 w-3.5" />
          </TBtn>

          <TDivider />

          {/* Headings */}
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

          {/* Text formatting */}
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

          {/* Lists */}
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

          {/* Alignment */}
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

          {/* Insert table */}
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

          {/* Save */}
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

      {/* ── Table toolbar (fixed below main toolbar, shown when in table) ── */}
      {!readOnly && inTable && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-blue-50 shrink-0">
          <span className="text-xs text-blue-500 font-medium mr-1 shrink-0">表:</span>

          {/* Column operations */}
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

          {/* Row operations */}
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

          {/* Merge/Split */}
          <TBtn onClick={() => editor.chain().focus().mergeCells().run()} title="セルを結合">
            <span className="flex items-center gap-0.5 text-xs"><Merge className="h-3 w-3" />結合</span>
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().splitCell().run()} title="セルを分割">
            <span className="flex items-center gap-0.5 text-xs"><Scissors className="h-3 w-3" />分割</span>
          </TBtn>

          <TDivider />

          {/* Delete table */}
          <TBtn onClick={() => editor.chain().focus().deleteTable().run()} title="表を削除" danger>
            <span className="flex items-center gap-0.5 text-xs"><Trash2 className="h-3 w-3" />表削除</span>
          </TBtn>
        </div>
      )}

      {/* ── Formula bar (shown when in table cell) ── */}
      {!readOnly && inTableCell && (
        <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-200 bg-amber-50 shrink-0">
          <span className="text-xs font-mono text-amber-700 font-bold shrink-0 w-8 text-center">{cellAddress || '—'}</span>
          <div className="w-px h-4 bg-amber-200 shrink-0" />
          <Calculator className="h-3 w-3 text-amber-500 shrink-0" />
          <input
            value={formulaBarValue}
            onChange={e => setFormulaBarValue(e.target.value)}
            onKeyDown={handleFormulaBarKeyDown}
            placeholder="値または数式（=A1+B2、=SUM(A1:A3)）を入力してEnter"
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

      {/* ── Editor content ── */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>

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
