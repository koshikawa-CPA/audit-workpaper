import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('audit_projects')
    .select(`
      *,
      created_by_profile:profiles!audit_projects_created_by_fkey(id, full_name),
      locked_by_profile:profiles!audit_projects_locked_by_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Add workpaper counts
  const projectsWithCounts = await Promise.all(
    (data || []).map(async (project) => {
      const { data: workpapers } = await supabase
        .from('workpapers')
        .select('status')
        .eq('project_id', project.id)

      const total = workpapers?.length || 0
      const completed =
        workpapers?.filter((w) => w.status === 'completed').length || 0

      return {
        ...project,
        workpapers_count: total,
        completed_count: completed,
      }
    })
  )

  return NextResponse.json(projectsWithCounts)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const body = await request.json()
  const { name, description, fiscal_year } = body

  if (!name || !fiscal_year) {
    return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('audit_projects')
    .insert({
      name,
      description: description || null,
      fiscal_year,
      created_by: user.id,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
