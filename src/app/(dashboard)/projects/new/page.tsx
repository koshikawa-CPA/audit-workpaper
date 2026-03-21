'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import Link from 'next/link'
import { ArrowLeft, FolderPlus } from 'lucide-react'

export default function NewProjectPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fiscal_year: new Date().getFullYear().toString(),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'プロジェクト名を入力してください'
    if (!formData.fiscal_year.trim()) newErrors.fiscal_year = '会計年度を入力してください'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setApiError(null)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '作成に失敗しました')
      }

      router.push('/projects')
      router.refresh()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">新規プロジェクト作成</h1>
      </div>

      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link
            href="/projects"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            プロジェクト一覧
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {apiError}
            </div>
          )}

          <Card padding="md">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              プロジェクト情報
            </h2>
            <div className="space-y-4">
              <Input
                label="プロジェクト名"
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                }}
                error={errors.name}
                placeholder="例: 2025年度 A社監査"
                required
              />

              <Input
                label="会計年度"
                value={formData.fiscal_year}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    fiscal_year: e.target.value,
                  }))
                  if (errors.fiscal_year)
                    setErrors((prev) => ({ ...prev, fiscal_year: '' }))
                }}
                error={errors.fiscal_year}
                placeholder="例: 2025年度 or 2025"
                required
              />

              <Textarea
                label="説明（任意）"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
                placeholder="プロジェクトの詳細説明..."
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
              <FolderPlus className="h-4 w-4" />
              プロジェクトを作成
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
