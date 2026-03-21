import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { WorkpaperEditForm } from './WorkpaperEditForm'
import { Button } from '@/components/ui/Button'
import type { Workpaper, Profile, AuditProject } from '@/types'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EditWorkpaperPage({
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
      project:audit_projects(id, name, fiscal_year, status)
    `)
    .eq('id', params.id)
    .single()

  if (error || !workpaper) {
    notFound()
  }

  const currentWorkpaper = workpaper as Workpaper
  const currentProfile = profile as Profile

  // Check permissions
  if (currentWorkpaper.project?.status === 'locked') {
    redirect(`/workpapers/${params.id}`)
  }

  const canEdit =
    currentProfile.role === 'admin' ||
    currentWorkpaper.assigned_creator === user.id ||
    currentWorkpaper.created_by === user.id

  if (!canEdit) {
    redirect(`/workpapers/${params.id}`)
  }

  const [{ data: projects }, { data: profiles }] = await Promise.all([
    supabase
      .from('audit_projects')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true }),
  ])

  return (
    <div>
      <Header title={`調書編集: ${currentWorkpaper.title}`} profile={currentProfile} />

      <div className="p-6">
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link
            href={`/workpapers/${params.id}`}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            調書詳細に戻る
          </Link>
        </div>

        <WorkpaperEditForm
          workpaper={currentWorkpaper}
          projects={(projects || []) as AuditProject[]}
          profiles={(profiles || []) as Profile[]}
        />
      </div>
    </div>
  )
}
