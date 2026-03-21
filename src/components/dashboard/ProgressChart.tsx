import Link from 'next/link'
import { Lock, FolderOpen } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { ProjectProgress } from '@/types'

interface ProgressChartProps {
  projectProgress: ProjectProgress[]
}

interface ProgressBarProps {
  label: string
  value: number
  total: number
  color: string
  bgColor: string
}

function ProgressBar({ label, value, total, color, bgColor }: ProgressBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right shrink-0">
        {value}
      </span>
    </div>
  )
}

export function ProgressChart({ projectProgress }: ProgressChartProps) {
  if (projectProgress.length === 0) {
    return (
      <Card padding="md">
        <CardHeader>
          <CardTitle>プロジェクト進捗</CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">プロジェクトがありません</p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>プロジェクト別進捗</CardTitle>
      </CardHeader>
      <div className="space-y-6">
        {projectProgress.map(({ project, stats }) => {
          const completionRate =
            stats.total_workpapers > 0
              ? (stats.completed / stats.total_workpapers) * 100
              : 0

          return (
            <div key={project.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={`/projects`}
                    className="font-medium text-gray-900 hover:text-blue-600 truncate"
                  >
                    {project.name}
                  </Link>
                  <span className="text-xs text-gray-400 shrink-0">
                    {project.fiscal_year}
                  </span>
                  {project.status === 'locked' && (
                    <Badge color="orange" className="shrink-0">
                      <Lock className="h-3 w-3 mr-1" />
                      ロック
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {completionRate.toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-400">
                    ({stats.completed}/{stats.total_workpapers})
                  </span>
                </div>
              </div>

              {/* Overall progress bar */}
              <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="h-full flex rounded-full overflow-hidden">
                  {stats.total_workpapers > 0 && (
                    <>
                      <div
                        className="bg-green-500 transition-all duration-500"
                        style={{
                          width: `${(stats.completed / stats.total_workpapers) * 100}%`,
                        }}
                        title={`完了: ${stats.completed}`}
                      />
                      <div
                        className="bg-yellow-400 transition-all duration-500"
                        style={{
                          width: `${(stats.pending_review / stats.total_workpapers) * 100}%`,
                        }}
                        title={`査閲待ち: ${stats.pending_review}`}
                      />
                      <div
                        className="bg-blue-400 transition-all duration-500"
                        style={{
                          width: `${(stats.in_progress / stats.total_workpapers) * 100}%`,
                        }}
                        title={`作成中: ${stats.in_progress}`}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                <ProgressBar
                  label="未着手"
                  value={stats.not_started}
                  total={stats.total_workpapers}
                  color="bg-gray-400"
                  bgColor="bg-gray-100"
                />
                <ProgressBar
                  label="作成中"
                  value={stats.in_progress}
                  total={stats.total_workpapers}
                  color="bg-blue-500"
                  bgColor="bg-blue-50"
                />
                <ProgressBar
                  label="査閲待ち"
                  value={stats.pending_review}
                  total={stats.total_workpapers}
                  color="bg-yellow-400"
                  bgColor="bg-yellow-50"
                />
                <ProgressBar
                  label="完了"
                  value={stats.completed}
                  total={stats.total_workpapers}
                  color="bg-green-500"
                  bgColor="bg-green-50"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-gray-500">凡例:</span>
        {[
          { color: 'bg-green-500', label: '完了' },
          { color: 'bg-yellow-400', label: '査閲待ち' },
          { color: 'bg-blue-400', label: '作成中' },
          { color: 'bg-gray-300', label: '未着手' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
