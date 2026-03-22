'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { WorkpaperForm } from '@/components/workpaper/WorkpaperForm'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Workpaper, Profile, AuditProject } from '@/types'
import { Save, Settings } from 'lucide-react'

interface WorkpaperEditFormProps {
  workpaper: Workpaper
  projects: AuditProject[]
  profiles: Profile[]
}

export function WorkpaperEditForm({
  workpaper,
  projects,
  profiles,
}: WorkpaperEditFormProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content')
  const [content, setContent] = useState<Record<string, unknown>>(
    workpaper.content || {}
  )
  const router = useRouter()

  const handleSave = useCallback(
    async (newContent: Record<string, unknown>) => {
      const response = await fetch(`/api/workpapers/${workpaper.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || '保存に失敗しました')
      }

      router.refresh()
    },
    [workpaper.id, router]
  )

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('content')}
          className={`
            flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${activeTab === 'content'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <Save className="h-4 w-4" />
          本文編集
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`
            flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${activeTab === 'settings'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          <Settings className="h-4 w-4" />
          基本設定
        </button>
      </div>

      {/* Content editor tab */}
      {activeTab === 'content' && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            本文を編集してください。ツールバーの「保存」ボタンまたは30秒ごとに自動保存されます。
          </p>
          <RichTextEditor
            content={workpaper.content}
            onChange={setContent}
            onSave={handleSave}
            placeholder="調書の内容を入力してください..."
            workpaperId={workpaper.id}
            projectId={workpaper.project_id}
          />
        </div>
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && (
        <WorkpaperForm
          workpaper={workpaper}
          projects={projects}
          profiles={profiles}
        />
      )}
    </div>
  )
}
