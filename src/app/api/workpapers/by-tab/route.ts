import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { project_id, tab_layer1_id, tab_layer2_id, tab_layer3_id, title, workpaper_number } =
    await request.json()

  // Try to find existing workpaper for this tab combination
  const { data: existing } = await supabase
    .from('workpapers')
    .select('*')
    .eq('project_id', project_id)
    .eq('tab_layer1_id', tab_layer1_id)
    .eq('tab_layer2_id', tab_layer2_id)
    .eq('tab_layer3_id', tab_layer3_id)
    .single()

  if (existing) {
    return NextResponse.json(existing)
  }

  // Check permission before creating
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['creator', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: newWorkpaper, error } = await supabase
    .from('workpapers')
    .insert({
      project_id,
      title,
      workpaper_number,
      tab_layer1_id,
      tab_layer2_id,
      tab_layer3_id,
      created_by: user.id,
      status: 'not_started',
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newWorkpaper, { status: 201 })
}
