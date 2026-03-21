import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('workpapers')
    .select(`
      *,
      project:audit_projects(id, name, fiscal_year, status),
      assigned_creator_profile:profiles!workpapers_assigned_creator_fkey(id, full_name, email, role),
      assigned_reviewer_profile:profiles!workpapers_assigned_reviewer_fkey(id, full_name, email, role),
      creator_checked_by_profile:profiles!workpapers_creator_checked_by_fkey(id, full_name),
      reviewer_checked_by_profile:profiles!workpapers_reviewer_checked_by_fkey(id, full_name),
      created_by_profile:profiles!workpapers_created_by_fkey(id, full_name, email),
      files:workpaper_files(*, uploaded_by_profile:profiles!workpaper_files_uploaded_by_fkey(id, full_name))
    `)
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // Get workpaper and check permissions
  const { data: workpaper } = await supabase
    .from('workpapers')
    .select('*, project:audit_projects(status)')
    .eq('id', params.id)
    .single()

  if (!workpaper) {
    return NextResponse.json({ error: '調書が見つかりません' }, { status: 404 })
  }

  if (workpaper.project?.status === 'locked') {
    return NextResponse.json(
      { error: 'このプロジェクトはロックされています' },
      { status: 403 }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const canEdit =
    profile?.role === 'admin' ||
    workpaper.assigned_creator === user.id ||
    workpaper.created_by === user.id

  if (!canEdit) {
    return NextResponse.json({ error: '編集権限がありません' }, { status: 403 })
  }

  const body = await request.json()
  const allowedFields = [
    'title',
    'workpaper_number',
    'category',
    'content',
    'assigned_creator',
    'assigned_reviewer',
    'status',
  ]

  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }

  // Admin can set status; others follow the status flow
  if ('status' in updateData && profile?.role !== 'admin') {
    // Only allow moving to in_progress from not_started
    if (
      updateData.status === 'in_progress' &&
      workpaper.status === 'not_started'
    ) {
      // allowed
    } else {
      delete updateData.status
    }
  }

  // Update status to in_progress when content is first set
  if ('content' in updateData && workpaper.status === 'not_started') {
    updateData.status = 'in_progress'
  }

  const { data, error } = await supabase
    .from('workpapers')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { error } = await supabase
    .from('workpapers')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
