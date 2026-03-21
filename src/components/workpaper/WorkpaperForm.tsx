'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import type { AuditProject, Profile, Workpaper } from '@/types'

interface WorkpaperFormProps {
  projects: AuditProject[]
  profiles: Profile[]
  workpaper?: Workpaper
  defaultProjectId?: string
}

export function WorkpaperForm({
  projects,
  profiles,
  workpaper,
  defaultProjectId,
}: WorkpaperFormProps) {
  const router = useRouter()
  const isEditing = !!workpaper

  const [formData, setFormData] = useState({
    project_id: workpaper?.project_id || defaultProjectId || '',
    title: workpaper?.title || '',
    workpaper_number: workpaper?.workpaper_number || '',
    category: workpaper?.category || '',
    assigned_creator: workpaper?.assigned_creator || '',
    assigned_reviewer: workpaper?.assigned_reviewer || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const creators = profiles.filter(
    (p) => p.role === 'creator' || p.role === 'admin'
  )
  const reviewers = profiles.filter(
    (p) => p.role === 'reviewer' || p.role === 'admin'
  )

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.project_id) newErrors.project_id = 'プロジェクトを選択してください'
    if (!formData.title.trim()) newErrors.title = 'タイトルを入力してください'
    if (!formData.workpaper_number.trim())
      newErrors.workpaper_number = '調書番号を入力してください'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setApiError(null)

    try {
      const url = isEditing
        ? `/api/workpapers/${workpaper.id}`
        : '/api/workpapers'
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '保存に失敗しました')
      }

      if (isEditing) {
        router.push(`/workpapers/${workpaper.id}`)
      } else {
        router.push(`/workpapers/${result.id}`)
      }
      router.refresh()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const activeProjects = projects.filter((p) => p.status === 'active')

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {apiError}
        </div>
      )}

      <Card padding="md">
        <h2 className="text-base font-semibold text-gray-900 mb-4">基本情報</h2>
        <div className="space-y-4">
          <Select
            label="プロジェクト"
            options={activeProjects.map((p) => ({
              value: p.id,
              label: `${p.name}（${p.fiscal_year}）`,
            }))}
            placeholder="プロジェクトを選択..."
            value={formData.project_id}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, project_id: e.target.value }))
              if (errors.project_id) setErrors((prev) => ({ ...prev, project_id: '' }))
            }}
            error={errors.project_id}
            required
            disabled={isEditing}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="調書番号"
              value={formData.workpaper_number}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  workpaper_number: e.target.value,
                }))
                if (errors.workpaper_number)
                  setErrors((prev) => ({ ...prev, workpaper_number: '' }))
              }}
              error={errors.workpaper_number}
              placeholder="例: WP-001"
              required
            />
            <div className="md:col-span-2">
              <Input
                label="タイトル"
                value={formData.title}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                  if (errors.title)
                    setErrors((prev) => ({ ...prev, title: '' }))
                }}
                error={errors.title}
                placeholder="調書のタイトルを入力..."
                required
              />
            </div>
          </div>

          <Input
            label="カテゴリ"
            value={formData.category}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, category: e.target.value }))
            }
            placeholder="例: 売上高、費用、資産..."
          />
        </div>
      </Card>

      <Card padding="md">
        <h2 className="text-base font-semibold text-gray-900 mb-4">担当者設定</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="作成者"
            options={creators.map((p) => ({
              value: p.id,
              label: p.full_name,
            }))}
            placeholder="担当者を選択..."
            value={formData.assigned_creator}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                assigned_creator: e.target.value,
              }))
            }
          />
          <Select
            label="査閲者"
            options={reviewers.map((p) => ({
              value: p.id,
              label: p.full_name,
            }))}
            placeholder="査閲者を選択..."
            value={formData.assigned_reviewer}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                assigned_reviewer: e.target.value,
              }))
            }
          />
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          キャンセル
        </Button>
        <Button type="submit" loading={loading}>
          {isEditing ? '更新する' : '作成する'}
        </Button>
      </div>
    </form>
  )
}
