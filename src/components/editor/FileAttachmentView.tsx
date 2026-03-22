'use client'

import { useState, useCallback } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import {
  FileText, FileSpreadsheet, Image as ImageIcon,
  Download, Eye, X, Trash2, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function humanSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('ms-excel'))
    return FileSpreadsheet
  return FileText
}

function isPreviewable(mimeType: string) {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/')
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({
  url, filename, mimeType, onClose,
}: {
  url: string
  filename: string
  mimeType: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl flex flex-col max-w-5xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <span className="text-sm font-medium text-gray-800 truncate max-w-[80%]">{filename}</span>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={filename}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
              onClick={e => e.stopPropagation()}
            >
              <Download className="h-3 w-3" />
              ダウンロード
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100">
          {mimeType.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={filename}
              className="max-w-full max-h-full mx-auto object-contain p-4"
            />
          ) : (
            <iframe
              src={url}
              title={filename}
              className="w-full h-full min-h-[70vh]"
              style={{ border: 'none' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Node view ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FileAttachmentView({ node, deleteNode, editor }: any) {
  const { fileId, filePath, filename, mimeType, fileSize } = node.attrs as {
    fileId: string | null
    filePath: string | null
    filename: string
    mimeType: string
    fileSize: number | null
  }

  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ url: string } | null>(null)

  const isEditable = editor?.isEditable ?? false
  const Icon = fileIcon(mimeType)
  const canPreview = isPreviewable(mimeType)

  const getSignedUrl = useCallback(async (): Promise<string | null> => {
    if (!filePath) return null
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('workpaper-attachments')
      .createSignedUrl(filePath, 3600)
    return data?.signedUrl ?? null
  }, [filePath])

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      const url = await getSignedUrl()
      if (!url) return
      if (canPreview) {
        setPreview({ url })
      } else {
        // Excel / Word → open in new tab (triggers download)
        window.open(url, '_blank')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!fileId) { deleteNode(); return }
    // Delete from DB (storage path is retained to avoid orphaned rows; the
    // workpaper_files cascade handles cleanup when workpaper is deleted)
    try {
      const supabase = createClient()
      // Also delete from storage
      if (filePath) {
        await supabase.storage.from('workpaper-attachments').remove([filePath])
      }
      await supabase.from('workpaper_files').delete().eq('id', fileId)
    } catch { /* ignore */ }
    deleteNode()
  }

  return (
    <NodeViewWrapper>
      {/* Attachment chip */}
      <div
        className="
          inline-flex items-center gap-2 my-1
          border border-gray-200 rounded-lg px-3 py-2
          bg-gray-50 hover:bg-gray-100 transition-colors
          cursor-pointer select-none max-w-sm
        "
        contentEditable={false}
        onClick={handleClick}
        title={canPreview ? 'クリックしてプレビュー' : 'クリックしてダウンロード'}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 text-gray-400 shrink-0 animate-spin" />
        ) : (
          <Icon className="h-4 w-4 text-blue-500 shrink-0" />
        )}

        <span className="text-sm text-gray-800 truncate max-w-[180px]">{filename}</span>

        {fileSize && (
          <span className="text-xs text-gray-400 shrink-0">{humanSize(fileSize)}</span>
        )}

        <span className="text-xs text-gray-400 shrink-0">
          {canPreview ? <Eye className="h-3 w-3" /> : <Download className="h-3 w-3" />}
        </span>

        {isEditable && (
          <button
            type="button"
            className="ml-1 p-0.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 shrink-0"
            onClick={e => { e.stopPropagation(); handleDelete() }}
            title="削除"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <PreviewModal
          url={preview.url}
          filename={filename}
          mimeType={mimeType}
          onClose={() => setPreview(null)}
        />
      )}
    </NodeViewWrapper>
  )
}
