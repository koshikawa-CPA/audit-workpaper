import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { TabConfig, TabItem } from '@/types'

// L2 default tabs per L1 tab (index matches L1 order)
const L1_L2_DEFAULTS: Array<{ title: string; l2Titles: string[] }> = [
  {
    title: '契約',
    l2Titles: ['クライアント概要', '契約書管理', 'その他'],
  },
  {
    title: '計画',
    l2Titles: Array.from({ length: 12 }, (_, i) => `様式${i + 1}`),
  },
  {
    title: '内部統制',
    l2Titles: [
      '全社的統制', '決算財務報告', 'ITGC', '情報処理統制',
      '業務処理売上高', '業務処理棚卸資産', '業務処理売掛金', 'その他',
    ],
  },
  {
    title: '中間監査',
    l2Titles: [
      '現金預金', '売掛金', '棚卸資産', '有形固定資産', '投資有価証券',
      '買掛金', '借入金', '未払金', '引当金', '資本金', '売上', '売上原価', '販管費',
    ],
  },
  {
    title: '期末監査',
    l2Titles: [
      '現金預金', '売掛金', '棚卸資産', '有形固定資産', '投資有価証券',
      '買掛金', '借入金', '未払金', '引当金', '資本金', '売上', '売上原価', '販管費',
    ],
  },
  {
    title: '審査',
    l2Titles: [
      '契約審査', '計画審査', '中間意見審査', '中間表示審査', '期末意見審査', '期末表示審査',
    ],
  },
]

const DEFAULT_L3_TITLES = ['A', 'A10', 'A11', 'A20', 'A30']

// Old generic L2 titles used before per-L1 customization
const OLD_GENERIC_L2_TITLES = [
  '現金預金', '売掛金', '棚卸資産', '有形固定資産', '投資有価証券',
  '買掛金', '借入金', '未払金', '引当金', '資本金', '売上', '売上原価', '販管費',
]

// Old 契約 L2 titles (before '契約審査' was removed)
const OLD_CONTRACT_L2_TITLES = ['クライアント概要', '契約審査', '契約書管理', 'その他']

function hasOldGenericL2(tabs: TabItem[]): boolean {
  if (tabs.length !== OLD_GENERIC_L2_TITLES.length) return false
  return tabs.every((t, i) => t.title === OLD_GENERIC_L2_TITLES[i])
}

function hasOldContractL2(tabs: TabItem[]): boolean {
  if (tabs.length !== OLD_CONTRACT_L2_TITLES.length) return false
  return tabs.every((t, i) => t.title === OLD_CONTRACT_L2_TITLES[i])
}

/**
 * Migrate a config created with the old uniform defaults:
 * - Rename L1[5] 'その他' → '審査'
 * - Replace L2 tabs that still match the old generic list with L1-specific defaults
 *   (except 中間監査/期末監査 which keep the account categories)
 * Returns { config, changed }
 */
function migrateOldConfig(config: TabConfig): { config: TabConfig; changed: boolean } {
  const genId = () => crypto.randomUUID()
  let changed = false

  // Step 1: rename L1 'その他' → '審査'
  const newLayer1 = config.layer1.map((l1, i) => {
    if (l1.title === 'その他' && i === 5) {
      changed = true
      return { ...l1, title: '審査' }
    }
    return l1
  })

  const newLayer2 = { ...config.layer2 }
  const newLayer3 = { ...config.layer3 }

  // Step 2: replace L2 tabs that still use old defaults
  for (let i = 0; i < newLayer1.length; i++) {
    const l1 = newLayer1[i]
    // 中間監査 (3) and 期末監査 (4) keep account categories — skip
    if (i === 3 || i === 4) continue

    const currentL2 = config.layer2[l1.id] ?? []
    // Detect old defaults: generic 13-item list OR old 契約 4-item list (with '契約審査')
    const isOldDefault = hasOldGenericL2(currentL2) || (i === 0 && hasOldContractL2(currentL2))
    if (!isOldDefault) continue // user already customized — skip

    changed = true
    const newL2Titles = L1_L2_DEFAULTS[i]?.l2Titles ?? []
    const newL2tabs: TabItem[] = newL2Titles.map(title => ({ id: genId(), title }))
    newLayer2[l1.id] = newL2tabs

    // Remove old L3 entries for this L1
    for (const oldL2 of currentL2) {
      delete newLayer3[`${l1.id}__${oldL2.id}`]
    }
    // Create new L3 entries
    for (const l2 of newL2tabs) {
      newLayer3[`${l1.id}__${l2.id}`] = DEFAULT_L3_TITLES.map(title => ({ id: genId(), title }))
    }
  }

  return { config: { layer1: newLayer1, layer2: newLayer2, layer3: newLayer3 }, changed }
}

function createDefaultConfig(): TabConfig {
  const genId = () => crypto.randomUUID()

  const layer1: TabItem[] = L1_L2_DEFAULTS.map(({ title }) => ({ id: genId(), title }))
  const layer2: Record<string, TabItem[]> = {}
  const layer3: Record<string, TabItem[]> = {}

  for (let i = 0; i < layer1.length; i++) {
    const l1 = layer1[i]
    const l2Titles = L1_L2_DEFAULTS[i].l2Titles
    const l2tabs: TabItem[] = l2Titles.map(title => ({ id: genId(), title }))
    layer2[l1.id] = l2tabs
    for (const l2 of l2tabs) {
      layer3[`${l1.id}__${l2.id}`] = DEFAULT_L3_TITLES.map(title => ({ id: genId(), title }))
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
    // Auto-migrate old configs that still use uniform L2 defaults
    const { config: migrated, changed } = migrateOldConfig(row.config as TabConfig)
    if (changed) {
      await supabase
        .from('workpaper_tab_configs')
        .update({ config: migrated })
        .eq('project_id', projectId)
      return NextResponse.json(migrated)
    }
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

// DELETE: Reset tab config to new defaults (preserves workpaper content, resets tab structure)
export async function DELETE(
  _request: NextRequest,
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

  const projectId = params.id
  const freshConfig = createDefaultConfig()

  const { error } = await supabase
    .from('workpaper_tab_configs')
    .upsert({ project_id: projectId, config: freshConfig }, { onConflict: 'project_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(freshConfig)
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
