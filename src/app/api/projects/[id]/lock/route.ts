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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
  }

  const { data: project } = await supabase
    .from('audit_projects')
    .select('status')
    .eq('id', params.id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
  }

  if (project.status === 'locked') {
    return NextResponse.json({ error: '既にロックされています' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('audit_projects')
    .update({
      status: 'locked',
      locked_at: new Date().toISOString(),
      locked_by: user.id,
    })
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

  const { data: project } = await supabase
    .from('audit_projects')
    .select('status')
    .eq('id', params.id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
  }

  if (project.status === 'active') {
    return NextResponse.json({ error: 'ロックされていません' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('audit_projects')
    .update({
      status: 'active',
      locked_at: null,
      locked_by: null,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
