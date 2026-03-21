import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ----------------------------------------------------------------
// POST /api/invitations  — 管理者が招待を作成
// ----------------------------------------------------------------
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
    return NextResponse.json({ error: '管理者のみ実行できます' }, { status: 403 })
  }

  const body = await request.json()
  const { email, role } = body as { email?: string; role?: string }

  if (!email || !role) {
    return NextResponse.json(
      { error: 'メールアドレスとロールは必須です' },
      { status: 400 }
    )
  }
  if (!['creator', 'reviewer', 'admin'].includes(role)) {
    return NextResponse.json({ error: '無効なロールです' }, { status: 400 })
  }

  // 既存ユーザーチェック
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    return NextResponse.json(
      { error: 'このメールアドレスは既に登録されています' },
      { status: 409 }
    )
  }

  // 有効な招待が既に存在するかチェック
  const { data: existingInvite } = await supabaseAdmin
    .from('invitations')
    .select('id')
    .eq('email', email)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existingInvite) {
    return NextResponse.json(
      { error: 'このメールアドレスには有効な招待が既に存在します' },
      { status: 409 }
    )
  }

  // 招待レコード作成
  const { data: invitation, error: insertError } = await supabaseAdmin
    .from('invitations')
    .insert({ email, role, invited_by: user.id })
    .select()
    .single()

  if (insertError || !invitation) {
    return NextResponse.json(
      { error: '招待の作成に失敗しました' },
      { status: 500 }
    )
  }

  // Supabase 招待メール送信
  const origin =
    request.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'

  const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${origin}/auth/accept-invite` }
  )

  if (emailError) {
    // ロールバック
    await supabaseAdmin.from('invitations').delete().eq('id', invitation.id)
    return NextResponse.json(
      { error: `招待メールの送信に失敗しました: ${emailError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: invitation, error: null }, { status: 201 })
}

// ----------------------------------------------------------------
// GET /api/invitations  — 管理者が招待一覧を取得
// ----------------------------------------------------------------
export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: '管理者のみ実行できます' }, { status: 403 })
  }

  const { data: invitations, error } = await supabaseAdmin
    .from('invitations')
    .select(
      `id, email, role, created_at, expires_at, used_at,
       invited_by_profile:profiles!invitations_invited_by_fkey(full_name)`
    )
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: invitations, error: null })
}
