import Link from 'next/link'
import { FileText, User, Calendar, Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from './StatusBadge'
import type { Workpaper } from '@/types'

interface WorkpaperCardProps {
  workpaper: Workpaper
  isProjectLocked?: boolean
}

export function WorkpaperCard({ workpaper, isProjectLocked }: WorkpaperCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Card padding="none" className="hover:shadow-md transition-shadow duration-200">
      <Link href={`/workpapers/${workpaper.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {workpaper.workpaper_number}
                </span>
                {workpaper.category && (
                  <span className="text-xs text-gray-500">{workpaper.category}</span>
                )}
                {isProjectLocked && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    <Lock className="h-3 w-3" />
                    ロック中
                  </span>
                )}
              </div>
              <h3 className="font-medium text-gray-900 truncate mb-2">
                {workpaper.title}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {workpaper.assigned_creator_profile && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    作成: {workpaper.assigned_creator_profile.full_name}
                  </span>
                )}
                {workpaper.assigned_reviewer_profile && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    査閲: {workpaper.assigned_reviewer_profile.full_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(workpaper.updated_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <StatusBadge status={workpaper.status} />
          </div>
        </div>

        {/* Check indicators */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full ${
                workpaper.creator_checked_at ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-xs text-gray-500">
              作成者チェック
              {workpaper.creator_checked_at && (
                <span className="text-green-600 ml-1">
                  ({formatDate(workpaper.creator_checked_at)})
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full ${
                workpaper.reviewer_checked_at ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-xs text-gray-500">
              査閲者チェック
              {workpaper.reviewer_checked_at && (
                <span className="text-green-600 ml-1">
                  ({formatDate(workpaper.reviewer_checked_at)})
                </span>
              )}
            </span>
          </div>
        </div>
      </Link>
    </Card>
  )
}
