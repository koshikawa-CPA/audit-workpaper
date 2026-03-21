import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/workpaper/StatusBadge'
import { CheckPanel } from '@/components/workpaper/CheckPanel'
import { FileAttachments } from '@/components/workpaper/FileAttachments'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Workpaper, Profile } from '@/types'
import { Edit, Lock, ArrowLeft, Calendar, User, Hash, Tag } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WorkpaperDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: workpaper, error } = await supabase
    .from('workpapers')
    .select(`
      *,
      project:audit_projects(id, name, fiscal_year, status),
      assigned_creator_profile:profiles!workpapers_assigned_creator_fkey(id, full_name, email, role),
      assigned_reviewer_profile:profiles!workpapers_assigned_reviewer_fkey(id, full_name, email, role),
      creator_checked_by_profile:profiles!workpapers_creator_checked_by_fkey(id, full_name),
      reviewer_checked_by_profile:profiles!workpapers_reviewer_checked_by_fkey(id, full_name),
      created_by_profile:profiles!workpapers_created_by_fkey(id, full_name, email),
      files:workpaper_files(*, uploaded_by_profile:profiles!workpaper_files_uploaded_by_fkey(id, full_name))
    `)
    .eq('id', params.id)
    .single()

  if (error || !workpaper) {
    notFound()
  }

  const currentWorkpaper = workpaper as Workpaper
  const currentProfile = profile as Profile
  const isLocked = currentWorkpaper.project?.status === 'locked'

  const canEdit =
    !isLocked &&
    (currentProfile.role === 'admin' ||
      currentWorkpaper.assigned_creator === user.id ||
      currentWorkpaper.created_by === user.id)

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

  return (
    <div>
      <Header title={currentWorkpaper.title} profile={currentProfile} />

      <div className="p-6">
        {/* Breadcrumb & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/workpapers"
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              調書一覧
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium truncate">
              {currentWorkpaper.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isLocked && (
              <Badge color="orange">
                <Lock className="h-3 w-3 mr-1" />
                プロジェクトロック中
              </Badge>
            )}
            {canEdit && (
              <Link href={`/workpapers/${params.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                  編集
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Metadata */}
            <Card padding="md">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">調書番号</p>
                    <p className="text-sm font-mono font-medium">
                      {currentWorkpaper.workpaper_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">ステータス</p>
                    <StatusBadge status={currentWorkpaper.status} />
                  </div>
                </div>
                {currentWorkpaper.category && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">カテゴリ</p>
                      <p className="text-sm">{currentWorkpaper.category}</p>
                    </div>
                  </div>
                )}
                {currentWorkpaper.project && (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">プロジェクト</p>
                      <p className="text-sm">
                        {currentWorkpaper.project.name}（
                        {currentWorkpaper.project.fiscal_year}）
                      </p>
                    </div>
                  </div>
                )}
                {currentWorkpaper.assigned_creator_profile && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">作成担当者</p>
                      <p className="text-sm">
                        {currentWorkpaper.assigned_creator_profile.full_name}
                      </p>
                    </div>
                  </div>
                )}
                {currentWorkpaper.assigned_reviewer_profile && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">査閲担当者</p>
                      <p className="text-sm">
                        {currentWorkpaper.assigned_reviewer_profile.full_name}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">更新日時</p>
                    <p className="text-sm">{formatDate(currentWorkpaper.updated_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">作成日時</p>
                    <p className="text-sm">{formatDate(currentWorkpaper.created_at)}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Content */}
            <Card padding="none">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">調書本文</h2>
              </div>
              {currentWorkpaper.content ? (
                <RichTextEditor
                  content={currentWorkpaper.content}
                  readOnly={true}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <p className="text-gray-500 mb-3">本文がまだ作成されていません</p>
                  {canEdit && (
                    <Link href={`/workpapers/${params.id}/edit`}>
                      <Button size="sm">
                        <Edit className="h-4 w-4" />
                        本文を編集する
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </Card>

            {/* File Attachments */}
            <FileAttachments
              workpaperId={params.id}
              files={currentWorkpaper.files || []}
              currentProfile={currentProfile}
              isProjectLocked={isLocked}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CheckPanel
              workpaper={currentWorkpaper}
              currentProfile={currentProfile}
              isProjectLocked={isLocked}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
