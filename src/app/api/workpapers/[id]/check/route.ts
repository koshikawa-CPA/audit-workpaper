import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
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

  const body = await request.json()
  const { check_type, comment } = body

  if (!check_type || !['creator', 'reviewer'].includes(check_type)) {
    return NextResponse.json({ error: '不正なチェックタイプです' }, { status: 400 })
  }

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

  if (check_type === 'creator') {
    // Validate: must be assigned creator or admin
    const canCheck =
      profile?.role === 'admin' ||
      (profile?.role === 'creator' && workpaper.assigned_creator === user.id)

    if (!canCheck) {
      return NextResponse.json(
        { error: '作成者チェックの権限がありません' },
        { status: 403 }
      )
    }

    if (workpaper.creator_checked_at) {
      return NextResponse.json(
        { error: '既に作成者チェック済みです' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('workpapers')
      .update({
        creator_checked_at: new Date().toISOString(),
        creator_checked_by: user.id,
        creator_comment: comment || null,
        status: 'pending_review',
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  if (check_type === 'reviewer') {
    // Validate: must be assigned reviewer or admin
    const canCheck =
      profile?.role === 'admin' ||
      (profile?.role === 'reviewer' && workpaper.assigned_reviewer === user.id)

    if (!canCheck) {
      return NextResponse.json(
        { error: '査閲者チェックの権限がありません' },
        { status: 403 }
      )
    }

    if (!workpaper.creator_checked_at) {
      return NextResponse.json(
        { error: '作成者チェックが完了していません' },
        { status: 400 }
      )
    }

    if (workpaper.reviewer_checked_at) {
      return NextResponse.json(
        { error: '既に査閲者チェック済みです' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('workpapers')
      .update({
        reviewer_checked_at: new Date().toISOString(),
        reviewer_checked_by: user.id,
        reviewer_comment: comment || null,
        status: 'completed',
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  }

  return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
}

// Admin reset
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

  const { data: workpaper } = await supabase
    .from('workpapers')
    .select('status')
    .eq('id', params.id)
    .single()

  if (!workpaper) {
    return NextResponse.json({ error: '調書が見つかりません' }, { status: 404 })
  }

  // Determine what status to reset to
  const resetStatus = 'in_progress'

  const { data, error } = await supabase
    .from('workpapers')
    .update({
      creator_checked_at: null,
      creator_checked_by: null,
      creator_comment: null,
      reviewer_checked_at: null,
      reviewer_checked_by: null,
      reviewer_comment: null,
      status: resetStatus,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
