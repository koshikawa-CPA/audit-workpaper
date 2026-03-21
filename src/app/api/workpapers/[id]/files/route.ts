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
    .from('workpaper_files')
    .select('*, uploaded_by_profile:profiles!workpaper_files_uploaded_by_fkey(id, full_name)')
    .eq('workpaper_id', params.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

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

  // Check project is not locked
  const { data: workpaper } = await supabase
    .from('workpapers')
    .select('project:audit_projects(status)')
    .eq('id', params.id)
    .single()

  if (workpaper?.project && (workpaper.project as unknown as { status: string }).status === 'locked') {
    return NextResponse.json(
      { error: 'このプロジェクトはロックされています' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { filename, file_path, file_size, mime_type } = body

  if (!filename || !file_path) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('workpaper_files')
    .insert({
      workpaper_id: params.id,
      filename,
      file_path,
      file_size: file_size || null,
      mime_type: mime_type || null,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
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

  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get('fileId')

  if (!fileId) {
    return NextResponse.json({ error: 'ファイルIDが必要です' }, { status: 400 })
  }

  // Check ownership
  const { data: file } = await supabase
    .from('workpaper_files')
    .select('uploaded_by')
    .eq('id', fileId)
    .single()

  if (!file) {
    return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (file.uploaded_by !== user.id && profile?.role !== 'admin') {
    return NextResponse.json({ error: '削除権限がありません' }, { status: 403 })
  }

  const { error } = await supabase
    .from('workpaper_files')
    .delete()
    .eq('id', fileId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
