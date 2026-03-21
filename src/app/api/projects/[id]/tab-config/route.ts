import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { TabConfig, TabItem } from '@/types'

function createDefaultConfig(): TabConfig {
  const genId = () => crypto.randomUUID()

  const l1Titles = ['契約', '計画', '内部統制', '中間監査', '期末監査', 'その他']
  const l2Titles = [
    '現金預金', '売掛金', '棚卸資産', '有形固定資産', '投資有価証券',
    '買掛金', '借入金', '未払金', '引当金', '資本金', '売上', '売上原価', '販管費',
  ]
  const l3Titles = ['A', 'A10', 'A11', 'A20', 'A30']

  const layer1: TabItem[] = l1Titles.map(title => ({ id: genId(), title }))
  const layer2: Record<string, TabItem[]> = {}
  const layer3: Record<string, TabItem[]> = {}

  for (const l1 of layer1) {
    const l2tabs: TabItem[] = l2Titles.map(title => ({ id: genId(), title }))
    layer2[l1.id] = l2tabs
    for (const l2 of l2tabs) {
      layer3[`${l1.id}__${l2.id}`] = l3Titles.map(title => ({ id: genId(), title }))
    }
  }

  return { layer1, layer2, layer3 }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = params.id

  const { data: row } = await supabase
    .from('workpaper_tab_configs')
    .select('config')
    .eq('project_id', projectId)
    .single()

  if (row) {
    return NextResponse.json(row.config)
  }

  // Create and return default config
  const defaultConfig = createDefaultConfig()
  const { data: newRow, error } = await supabase
    .from('workpaper_tab_configs')
    .insert({ project_id: projectId, config: defaultConfig })
    .select('config')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newRow.config)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['creator', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const projectId = params.id

  const { error } = await supabase
    .from('workpaper_tab_configs')
    .upsert({ project_id: projectId, config: body }, { onConflict: 'project_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
