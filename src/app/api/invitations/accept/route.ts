import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ----------------------------------------------------------------
// POST /api/invitations/accept  — 招待を受け入れてプロフィールを確定
// ----------------------------------------------------------------
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { full_name } = (await request.json()) as { full_name?: string }

  if (!full_name?.trim()) {
    return NextResponse.json({ error: '氏名は必須です' }, { status: 400 })
  }

  const userEmail = user.email
  if (!userEmail) {
    return NextResponse.json({ error: 'ユーザーのメールアドレスが取得できません' }, { status: 400 })
  }

  // 有効な招待を検索 (メールアドレスで)
  const { data: invitation, error: inviteError } = await supabaseAdmin
    .from('invitations')
    .select('id, role')
    .eq('email', userEmail)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: '有効な招待が見つかりません。管理者に再招待を依頼してください。' },
      { status: 404 }
    )
  }

  // プロフィールを更新 (氏名 + 招待ロール)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ full_name: full_name.trim(), role: invitation.role })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    )
  }

  // 招待を使用済みにする
  await supabaseAdmin
    .from('invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return NextResponse.json({ data: { role: invitation.role }, error: null })
}
