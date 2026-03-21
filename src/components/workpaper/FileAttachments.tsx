'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, Download, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import type { WorkpaperFile, Profile } from '@/types'
import { useRouter } from 'next/navigation'

interface FileAttachmentsProps {
  workpaperId: string
  files: WorkpaperFile[]
  currentProfile: Profile
  isProjectLocked?: boolean
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'image/png': '🖼️',
  'image/jpeg': '🖼️',
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '不明'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileAttachments({
  workpaperId,
  files,
  currentProfile,
  isProjectLocked,
}: FileAttachmentsProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError('対応していないファイル形式です。PDF、Excel、Word、画像ファイルをアップロードしてください。')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('ファイルサイズが50MBを超えています。')
      return
    }

    setUploading(true)
    setUploadError(null)
    setUploadProgress(0)

    try {
      const timestamp = Date.now()
      const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${currentProfile.id}/${workpaperId}/${timestamp}_${safeFilename}`

      const { error: uploadError } = await supabase.storage
        .from('workpaper-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      setUploadProgress(80)

      const response = await fetch(`/api/workpapers/${workpaperId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'ファイル情報の保存に失敗しました')
      }

      setUploadProgress(100)
      router.refresh()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (file: WorkpaperFile) => {
    if (!confirm(`「${file.filename}」を削除しますか？`)) return

    setDeletingId(file.id)
    try {
      // Delete from storage
      await supabase.storage
        .from('workpaper-attachments')
        .remove([file.file_path])

      // Delete record
      const response = await fetch(
        `/api/workpapers/${workpaperId}/files?fileId=${file.id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || '削除に失敗しました')
      }

      router.refresh()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (file: WorkpaperFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('workpaper-attachments')
        .createSignedUrl(file.file_path, 60)

      if (error) throw error

      const link = document.createElement('a')
      link.href = data.signedUrl
      link.download = file.filename
      link.click()
    } catch (err) {
      setUploadError('ダウンロードに失敗しました')
    }
  }

  const canDelete = (file: WorkpaperFile) =>
    !isProjectLocked &&
    (file.uploaded_by === currentProfile.id || currentProfile.role === 'admin')

  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>添付ファイル</CardTitle>
        <span className="text-sm text-gray-500">{files.length} 件</span>
      </CardHeader>

      {/* Upload area */}
      {!isProjectLocked && (
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`
              flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg
              cursor-pointer transition-colors
              ${uploading
                ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }
            `}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-600">アップロード中...</span>
                <div className="w-48 bg-blue-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  クリックしてファイルを選択
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF、Excel、Word（最大50MB）
                </p>
              </>
            )}
          </label>
        </div>
      )}

      {uploadError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm mb-4">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* File list */}
      {files.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          添付ファイルはありません
        </p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-xl shrink-0">
                {FILE_ICONS[file.mime_type || ''] || '📎'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.filename}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.file_size)} •{' '}
                  {new Date(file.created_at).toLocaleDateString('ja-JP')}
                  {file.uploaded_by_profile && (
                    <> • {file.uploaded_by_profile.full_name}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(file)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="ダウンロード"
                >
                  <Download className="h-4 w-4" />
                </button>
                {canDelete(file) && (
                  <button
                    onClick={() => handleDelete(file)}
                    disabled={deletingId === file.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="削除"
                  >
                    {deletingId === file.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
