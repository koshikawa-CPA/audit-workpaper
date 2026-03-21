import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { WorkpaperForm } from '@/components/workpaper/WorkpaperForm'
import type { Profile, AuditProject } from '@/types'

export const dynamic = 'force-dynamic'

export default async function NewWorkpaperPage({
  searchParams,
}: {
  searchParams: { project_id?: string }
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  if (!profile || (profile.role !== 'creator' && profile.role !== 'admin')) {
    redirect('/workpapers')
  }

  const [{ data: projects }, { data: profiles }] = await Promise.all([
    supabase
      .from('audit_projects')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true }),
  ])

  return (
    <div>
      <Header title="新規調書作成" profile={profile as Profile} />
      <div className="p-6 max-w-2xl mx-auto">
        <WorkpaperForm
          projects={(projects || []) as AuditProject[]}
          profiles={(profiles || []) as Profile[]}
          defaultProjectId={searchParams.project_id}
        />
      </div>
    </div>
  )
}
