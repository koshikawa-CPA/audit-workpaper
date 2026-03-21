import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { AuditProject, Profile } from '@/types'
import { Plus, FolderOpen, Lock, Unlock, FileText, Calendar } from 'lucide-react'
import { ProjectLockButton } from './ProjectLockButton'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
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

  if ((profile as Profile)?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: projects } = await supabase
    .from('audit_projects')
    .select(`
      *,
      created_by_profile:profiles!audit_projects_created_by_fkey(id, full_name),
      locked_by_profile:profiles!audit_projects_locked_by_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false })

  // Get workpaper counts per project
  const projectsWithCounts = await Promise.all(
    (projects || []).map(async (project) => {
      const { data: workpapers } = await supabase
        .from('workpapers')
        .select('status')
        .eq('project_id', project.id)

      const total = workpapers?.length || 0
      const completed = workpapers?.filter((w) => w.status === 'completed').length || 0

      return { ...project, workpapers_count: total, completed_count: completed }
    })
  )

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      <Header title="プロジェクト管理" profile={profile as Profile} />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {projectsWithCounts.length} 件のプロジェクト
          </p>
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4" />
              新規プロジェクト
            </Button>
          </Link>
        </div>

        {projectsWithCounts.length === 0 ? (
          <Card padding="lg" className="text-center">
            <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">
              プロジェクトがありません
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              最初の監査プロジェクトを作成してください
            </p>
            <Link href="/projects/new">
              <Button>
                <Plus className="h-4 w-4" />
                プロジェクトを作成
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {projectsWithCounts.map((project) => {
              const completionRate =
                project.workpapers_count > 0
                  ? (project.completed_count / project.workpapers_count) * 100
                  : 0

              return (
                <Card key={project.id} padding="md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          {project.name}
                        </h3>
                        <Badge color="gray">{project.fiscal_year}</Badge>
                        {project.status === 'locked' ? (
                          <Badge color="orange">
                            <Lock className="h-3 w-3 mr-1" />
                            ロック中
                          </Badge>
                        ) : (
                          <Badge color="green">進行中</Badge>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-sm text-gray-500 mb-3">
                          {project.description}
                        </p>
                      )}

                      {/* Progress */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-xs">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {project.completed_count}/{project.workpapers_count} 完了
                          （{completionRate.toFixed(0)}%）
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {project.workpapers_count} 件の調書
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          作成: {formatDate(project.created_at)}
                        </span>
                        {project.created_by_profile && (
                          <span>作成者: {(project.created_by_profile as { full_name: string }).full_name}</span>
                        )}
                        {project.status === 'locked' && project.locked_by_profile && (
                          <span className="text-orange-600">
                            ロック: {(project.locked_by_profile as { full_name: string }).full_name}（
                            {formatDate(project.locked_at)}）
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/workpapers?project_id=${project.id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4" />
                          調書一覧
                        </Button>
                      </Link>
                      <ProjectLockButton
                        projectId={project.id}
                        isLocked={project.status === 'locked'}
                      />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
