import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { ProgressChart } from '@/components/dashboard/ProgressChart'
import { WorkpaperCard } from '@/components/workpaper/WorkpaperCard'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DashboardStats, ProjectProgress, Workpaper, AuditProject, Profile } from '@/types'
import Link from 'next/link'
import { Plus, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get all workpapers with project info
  const { data: workpapers } = await supabase
    .from('workpapers')
    .select(`
      *,
      project:audit_projects(id, name, fiscal_year, status),
      assigned_creator_profile:profiles!workpapers_assigned_creator_fkey(id, full_name, email, role),
      assigned_reviewer_profile:profiles!workpapers_assigned_reviewer_fkey(id, full_name, email, role),
      files:workpaper_files(id)
    `)
    .order('updated_at', { ascending: false })

  // Get all projects
  const { data: projects } = await supabase
    .from('audit_projects')
    .select('*')
    .order('created_at', { ascending: false })

  const allWorkpapers = (workpapers || []) as Workpaper[]
  const allProjects = (projects || []) as AuditProject[]

  // Calculate overall stats
  const stats: DashboardStats = {
    total_workpapers: allWorkpapers.length,
    not_started: allWorkpapers.filter((w) => w.status === 'not_started').length,
    in_progress: allWorkpapers.filter((w) => w.status === 'in_progress').length,
    pending_review: allWorkpapers.filter((w) => w.status === 'pending_review').length,
    completed: allWorkpapers.filter((w) => w.status === 'completed').length,
    completion_rate:
      allWorkpapers.length > 0
        ? (allWorkpapers.filter((w) => w.status === 'completed').length /
            allWorkpapers.length) *
          100
        : 0,
  }

  // Calculate per-project progress
  const projectProgress: ProjectProgress[] = allProjects.map((project) => {
    const projectWorkpapers = allWorkpapers.filter(
      (w) => w.project_id === project.id
    )
    const projectStats: DashboardStats = {
      total_workpapers: projectWorkpapers.length,
      not_started: projectWorkpapers.filter((w) => w.status === 'not_started').length,
      in_progress: projectWorkpapers.filter((w) => w.status === 'in_progress').length,
      pending_review: projectWorkpapers.filter((w) => w.status === 'pending_review').length,
      completed: projectWorkpapers.filter((w) => w.status === 'completed').length,
      completion_rate:
        projectWorkpapers.length > 0
          ? (projectWorkpapers.filter((w) => w.status === 'completed').length /
              projectWorkpapers.length) *
            100
          : 0,
    }
    return { project, stats: projectStats }
  })

  // Recent workpapers (last 5 updated)
  const recentWorkpapers = allWorkpapers.slice(0, 5)

  // My workpapers (assigned to me)
  const myWorkpapers = allWorkpapers.filter(
    (w) =>
      w.assigned_creator === user.id ||
      w.assigned_reviewer === user.id ||
      w.created_by === user.id
  ).slice(0, 5)

  return (
    <div>
      <Header title="ダッシュボード" profile={profile as Profile} />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Progress by project */}
        {projectProgress.length > 0 && (
          <ProgressChart projectProgress={projectProgress} />
        )}

        {/* My Tasks + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My workpapers */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>担当調書</CardTitle>
              <Link href="/workpapers">
                <Button variant="ghost" size="sm">
                  すべて表示
                </Button>
              </Link>
            </CardHeader>
            {myWorkpapers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">担当の調書はありません</p>
                <Link href="/workpapers/new" className="mt-3">
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                    新規作成
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myWorkpapers.map((workpaper) => (
                  <WorkpaperCard
                    key={workpaper.id}
                    workpaper={workpaper}
                    isProjectLocked={workpaper.project?.status === 'locked'}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Recently updated */}
          <Card padding="md">
            <CardHeader>
              <CardTitle>最近の更新</CardTitle>
              <Link href="/workpapers">
                <Button variant="ghost" size="sm">
                  すべて表示
                </Button>
              </Link>
            </CardHeader>
            {recentWorkpapers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">調書がありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentWorkpapers.map((workpaper) => (
                  <WorkpaperCard
                    key={workpaper.id}
                    workpaper={workpaper}
                    isProjectLocked={workpaper.project?.status === 'locked'}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
