import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const [{ data: outgoing, error: e1 }, { data: incoming, error: e2 }] = await Promise.all([
    supabase
      .from('workpaper_references')
      .select(`
        id,
        to_workpaper:workpapers!workpaper_references_to_workpaper_id_fkey(id, title, workpaper_number, status)
      `)
      .eq('from_workpaper_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('workpaper_references')
      .select(`
        id,
        from_workpaper:workpapers!workpaper_references_from_workpaper_id_fkey(id, title, workpaper_number, status)
      `)
      .eq('to_workpaper_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  if (e1 || e2) {
    return NextResponse.json({ error: (e1 || e2)!.message }, { status: 500 })
  }

  return NextResponse.json({ outgoing: outgoing ?? [], incoming: incoming ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { to_workpaper_id } = await request.json()
  if (!to_workpaper_id) {
    return NextResponse.json({ error: 'to_workpaper_id は必須です' }, { status: 400 })
  }
  if (to_workpaper_id === params.id) {
    return NextResponse.json({ error: '自己参照はできません' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('workpaper_references')
    .insert({
      from_workpaper_id: params.id,
      to_workpaper_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Ignore duplicate (UNIQUE constraint violation)
    if (error.code === '23505') {
      return NextResponse.json({}, { status: 200 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { to_workpaper_id } = await request.json()
  if (!to_workpaper_id) {
    return NextResponse.json({ error: 'to_workpaper_id は必須です' }, { status: 400 })
  }

  const { error } = await supabase
    .from('workpaper_references')
    .delete()
    .eq('from_workpaper_id', params.id)
    .eq('to_workpaper_id', to_workpaper_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({}, { status: 200 })
}
