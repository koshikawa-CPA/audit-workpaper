import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const status = searchParams.get('status')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let query = supabase
    .from('workpapers')
    .select(`
      *,
      project:audit_projects(id, name, fiscal_year, status),
      assigned_creator_profile:profiles!workpapers_assigned_creator_fkey(id, full_name, email, role),
      assigned_reviewer_profile:profiles!workpapers_assigned_reviewer_fkey(id, full_name, email, role),
      creator_checked_by_profile:profiles!workpapers_creator_checked_by_fkey(id, full_name),
      reviewer_checked_by_profile:profiles!workpapers_reviewer_checked_by_fkey(id, full_name),
      files:workpaper_files(*, uploaded_by_profile:profiles!workpaper_files_uploaded_by_fkey(id, full_name))
    `)
    .order('workpaper_number', { ascending: true })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'creator' && profile.role !== 'admin')) {
    return NextResponse.json(
      { error: '調書を作成する権限がありません' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { project_id, title, workpaper_number, category, assigned_creator, assigned_reviewer } = body

  if (!project_id || !title || !workpaper_number) {
    return NextResponse.json(
      { error: '必須項目を入力してください' },
      { status: 400 }
    )
  }

  // Check project is not locked
  const { data: project } = await supabase
    .from('audit_projects')
    .select('status')
    .eq('id', project_id)
    .single()

  if (!project) {
    return NextResponse.json(
      { error: 'プロジェクトが見つかりません' },
      { status: 404 }
    )
  }

  if (project.status === 'locked') {
    return NextResponse.json(
      { error: 'このプロジェクトはロックされています' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('workpapers')
    .insert({
      project_id,
      title,
      workpaper_number,
      category: category || null,
      assigned_creator: assigned_creator || null,
      assigned_reviewer: assigned_reviewer || null,
      created_by: user.id,
      status: 'not_started',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
