'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Input'
import type { Workpaper, Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CheckPanelProps {
  workpaper: Workpaper
  currentProfile: Profile
  isProjectLocked?: boolean
}

export function CheckPanel({ workpaper, currentProfile, isProjectLocked }: CheckPanelProps) {
  const [creatorComment, setCreatorComment] = useState(workpaper.creator_comment || '')
  const [reviewerComment, setReviewerComment] = useState(workpaper.reviewer_comment || '')
  const [loading, setLoading] = useState<'creator' | 'reviewer' | 'reset' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const canCreatorCheck =
    !isProjectLocked &&
    !workpaper.creator_checked_at &&
    (currentProfile.role === 'creator' || currentProfile.role === 'admin') &&
    (workpaper.assigned_creator === currentProfile.id ||
      currentProfile.role === 'admin')

  const canReviewerCheck =
    !isProjectLocked &&
    workpaper.creator_checked_at &&
    !workpaper.reviewer_checked_at &&
    workpaper.status === 'pending_review' &&
    (currentProfile.role === 'reviewer' || currentProfile.role === 'admin') &&
    (workpaper.assigned_reviewer === currentProfile.id ||
      currentProfile.role === 'admin')

  const canReset =
    !isProjectLocked &&
    currentProfile.role === 'admin' &&
    (workpaper.creator_checked_at || workpaper.reviewer_checked_at)

  const handleCheck = async (checkType: 'creator' | 'reviewer') => {
    setLoading(checkType)
    setError(null)
    try {
      const comment =
        checkType === 'creator' ? creatorComment : reviewerComment
      const response = await fetch(
        `/api/workpapers/${workpaper.id}/check`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ check_type: checkType, comment }),
        }
      )
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'チェックに失敗しました')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(null)
    }
  }

  const handleReset = async () => {
    setLoading('reset')
    setError(null)
    try {
      const response = await fetch(`/api/workpapers/${workpaper.id}/check`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'リセットに失敗しました')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Creator Check */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>作成者チェック</CardTitle>
          {workpaper.creator_checked_at ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Clock className="h-5 w-5 text-gray-400" />
          )}
        </CardHeader>

        {workpaper.creator_checked_at ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                {workpaper.creator_checked_by_profile?.full_name} が{' '}
                {formatDate(workpaper.creator_checked_at)} にチェック済み
              </span>
            </div>
            {workpaper.creator_comment && (
              <div className="bg-gray-50 px-3 py-2 rounded-md text-sm text-gray-700">
                <p className="font-medium text-xs text-gray-500 mb-1">コメント:</p>
                <p>{workpaper.creator_comment}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <XCircle className="h-4 w-4" />
              <span>未チェック</span>
            </div>
            {workpaper.assigned_creator_profile && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <User className="h-3.5 w-3.5" />
                担当者: {workpaper.assigned_creator_profile.full_name}
              </div>
            )}
            {canCreatorCheck && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <Textarea
                  label="コメント（任意）"
                  value={creatorComment}
                  onChange={(e) => setCreatorComment(e.target.value)}
                  rows={3}
                  placeholder="チェックコメントを入力..."
                />
                <Button
                  onClick={() => handleCheck('creator')}
                  loading={loading === 'creator'}
                  size="sm"
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4" />
                  作成者チェックを完了する
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Reviewer Check */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>査閲者チェック</CardTitle>
          {workpaper.reviewer_checked_at ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Clock className="h-5 w-5 text-gray-400" />
          )}
        </CardHeader>

        {workpaper.reviewer_checked_at ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                {workpaper.reviewer_checked_by_profile?.full_name} が{' '}
                {formatDate(workpaper.reviewer_checked_at)} にチェック済み
              </span>
            </div>
            {workpaper.reviewer_comment && (
              <div className="bg-gray-50 px-3 py-2 rounded-md text-sm text-gray-700">
                <p className="font-medium text-xs text-gray-500 mb-1">コメント:</p>
                <p>{workpaper.reviewer_comment}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {workpaper.creator_checked_at ? (
                <>
                  <Clock className="h-4 w-4" />
                  <span>査閲待ち</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  <span>作成者チェック待ち</span>
                </>
              )}
            </div>
            {workpaper.assigned_reviewer_profile && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <User className="h-3.5 w-3.5" />
                担当者: {workpaper.assigned_reviewer_profile.full_name}
              </div>
            )}
            {canReviewerCheck && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <Textarea
                  label="コメント（任意）"
                  value={reviewerComment}
                  onChange={(e) => setReviewerComment(e.target.value)}
                  rows={3}
                  placeholder="査閲コメントを入力..."
                />
                <Button
                  onClick={() => handleCheck('reviewer')}
                  loading={loading === 'reviewer'}
                  size="sm"
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4" />
                  査閲者チェックを完了する
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Admin Reset */}
      {canReset && (
        <Card padding="md" className="border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-800 mb-3">管理者操作</p>
          <Button
            variant="danger"
            size="sm"
            onClick={handleReset}
            loading={loading === 'reset'}
          >
            チェックをリセット
          </Button>
        </Card>
      )}
    </div>
  )
}
