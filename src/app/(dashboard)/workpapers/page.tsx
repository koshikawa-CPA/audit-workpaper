import { createClient } from '@/lib/supabase/server'
import { ThreeLayerTabs } from '@/components/workpaper/ThreeLayerTabs'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProjectSelector } from './ProjectSelector'
import type { Profile, AuditProject } from '@/types'
import Link from 'next/link'
import { Plus, FolderOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: {
    project_id?: string
    view?: string
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

  const { data: projects } = await supabase
    .from('audit_projects')
    .select('id, name, fiscal_year, status, description, locked_at, locked_by, created_by, created_at, updated_at')
    .order('created_at', { ascending: false })

  const allProjects = (projects || []) as AuditProject[]

  // Determine selected project
  const selectedProjectId = searchParams.project_id || allProjects[0]?.id
  const selectedProject = allProjects.find(p => p.id === selectedProjectId) ?? allProjects[0]

  const canCreate =
    (profile as Profile)?.role === 'creator' ||
    (profile as Profile)?.role === 'admin'

  // No projects case
  if (allProjects.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900">調書一覧</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card padding="lg" className="text-center max-w-sm">
            <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">
              プロジェクトがありません
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              調書を管理するにはプロジェクトを作成してください
            </p>
            {(profile as Profile)?.role === 'admin' && (
              <Link href="/projects/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  プロジェクトを作成
                </Button>
              </Link>
            )}
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with project selector */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">調書一覧</h1>
          <ProjectSelector projects={allProjects} selectedProjectId={selectedProjectId ?? ''} />
          {selectedProject?.status === 'locked' && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
              ロック済み
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCreate && selectedProject?.status !== 'locked' && (
            <Link href={`/workpapers/new${selectedProjectId ? `?project_id=${selectedProjectId}` : ''}`}>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                新規調書
              </Button>
            </Link>
          )}
          <span className="text-sm text-gray-500">{profile ? (profile as Profile).full_name : ''}</span>
        </div>
      </div>

      {/* 3-Layer tabs */}
      {selectedProject ? (
        <div className="flex-1 overflow-hidden">
          <ThreeLayerTabs
            project={selectedProject}
            profile={profile as Profile}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">プロジェクトを選択してください</p>
        </div>
      )}
    </div>
  )
}
