import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { WorkpaperCard } from '@/components/workpaper/WorkpaperCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Workpaper, Profile, AuditProject } from '@/types'
import Link from 'next/link'
import { Plus, FileText, Filter } from 'lucide-react'
import { WorkpapersFilter } from './WorkpapersFilter'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: {
    project_id?: string
    status?: string
    search?: string
  }
}

export default async function WorkpapersPage({ searchParams }: PageProps) {
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

  // Build query
  let query = supabase
    .from('workpapers')
    .select(`
      *,
      project:audit_projects(id, name, fiscal_year, status),
      assigned_creator_profile:profiles!workpapers_assigned_creator_fkey(id, full_name, email, role),
      assigned_reviewer_profile:profiles!workpapers_assigned_reviewer_fkey(id, full_name, email, role),
      creator_checked_by_profile:profiles!workpapers_creator_checked_by_fkey(id, full_name),
      reviewer_checked_by_profile:profiles!workpapers_reviewer_checked_by_fkey(id, full_name),
      files:workpaper_files(id)
    `)
    .order('workpaper_number', { ascending: true })

  if (searchParams.project_id) {
    query = query.eq('project_id', searchParams.project_id)
  }

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const { data: workpapers } = await query
  const { data: projects } = await supabase
    .from('audit_projects')
    .select('id, name, fiscal_year, status')
    .order('created_at', { ascending: false })

  let filteredWorkpapers = (workpapers || []) as Workpaper[]

  // Client-side text search
  if (searchParams.search) {
    const searchLower = searchParams.search.toLowerCase()
    filteredWorkpapers = filteredWorkpapers.filter(
      (w) =>
        w.title.toLowerCase().includes(searchLower) ||
        w.workpaper_number.toLowerCase().includes(searchLower) ||
        (w.category?.toLowerCase() || '').includes(searchLower)
    )
  }

  const canCreate =
    (profile as Profile)?.role === 'creator' ||
    (profile as Profile)?.role === 'admin'

  return (
    <div>
      <Header title="調書一覧" profile={profile as Profile} />

      <div className="p-6 space-y-4">
        {/* Filter bar */}
        <WorkpapersFilter
          projects={(projects || []) as AuditProject[]}
          currentFilters={searchParams}
        />

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredWorkpapers.length} 件の調書
          </p>
          {canCreate && (
            <Link href="/workpapers/new">
              <Button>
                <Plus className="h-4 w-4" />
                新規作成
              </Button>
            </Link>
          )}
        </div>

        {/* Workpapers list */}
        {filteredWorkpapers.length === 0 ? (
          <Card padding="lg" className="text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">
              調書がありません
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchParams.status || searchParams.project_id || searchParams.search
                ? 'フィルター条件に一致する調書はありません'
                : 'まだ調書が作成されていません'}
            </p>
            {canCreate && (
              <Link href="/workpapers/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  最初の調書を作成
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredWorkpapers.map((workpaper) => (
              <WorkpaperCard
                key={workpaper.id}
                workpaper={workpaper}
                isProjectLocked={workpaper.project?.status === 'locked'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
