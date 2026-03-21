'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Lock, Unlock } from 'lucide-react'

interface ProjectLockButtonProps {
  projectId: string
  isLocked: boolean
}

export function ProjectLockButton({ projectId, isLocked }: ProjectLockButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async () => {
    const confirmMessage = isLocked
      ? 'このプロジェクトのロックを解除しますか？編集が可能になります。'
      : 'このプロジェクトをロックしますか？ロック後は調書の編集ができなくなります。'

    if (!confirm(confirmMessage)) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/lock`,
        {
          method: isLocked ? 'DELETE' : 'POST',
        }
      )

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || '操作に失敗しました')
      }

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={isLocked ? 'outline' : 'danger'}
      size="sm"
      onClick={handleToggle}
      loading={loading}
    >
      {isLocked ? (
        <>
          <Unlock className="h-4 w-4" />
          ロック解除
        </>
      ) : (
        <>
          <Lock className="h-4 w-4" />
          ロック
        </>
      )}
    </Button>
  )
}
