'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Loader2, FileText, RotateCcw } from 'lucide-react'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import type { TabConfig, TabItem, AuditProject, Profile, Workpaper } from '@/types'
import { STATUS_LABELS } from '@/types'
import Link from 'next/link'

interface ThreeLayerTabsProps {
  project: AuditProject
  profile: Profile
}

interface ContextMenuState {
  x: number
  y: number
  layer: 1 | 2 | 3
  tabId: string
  tabTitle: string
}

const MAX_L2_TABS = 30
const MAX_L3_TABS = 20

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    pending_review: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export function ThreeLayerTabs({ project, profile }: ThreeLayerTabsProps) {
  const [tabConfig, setTabConfig] = useState<TabConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [selectedL1, setSelectedL1] = useState<string>('')
  const [selectedL2, setSelectedL2] = useState<string>('')
  const [selectedL3, setSelectedL3] = useState<string>('')
  const [workpaper, setWorkpaper] = useState<Workpaper | null>(null)
  const [editorContent, setEditorContent] = useState<Record<string, unknown> | null>(null)
  const [loadingWorkpaper, setLoadingWorkpaper] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renameTarget, setRenameTarget] = useState<{ layer: 1 | 2 | 3; id: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const canEdit = profile.role === 'creator' || profile.role === 'admin'

  // Load tab config and apply first selection
  function applyConfig(config: TabConfig) {
    setTabConfig(config)
    if (config.layer1.length > 0) {
      const l1 = config.layer1[0]
      setSelectedL1(l1.id)
      const l2tabs = config.layer2[l1.id] ?? []
      if (l2tabs.length > 0) {
        const l2 = l2tabs[0]
        setSelectedL2(l2.id)
        const l3tabs = config.layer3[`${l1.id}__${l2.id}`] ?? []
        if (l3tabs.length > 0) setSelectedL3(l3tabs[0].id)
        else setSelectedL3('')
      } else { setSelectedL2(''); setSelectedL3('') }
    }
  }

  useEffect(() => {
    async function load() {
      setLoadingConfig(true)
      try {
        const res = await fetch(`/api/projects/${project.id}/tab-config`)
        if (res.ok) {
          const config: TabConfig = await res.json()
          applyConfig(config)
        }
      } finally {
        setLoadingConfig(false)
      }
    }
    load()
  }, [project.id])

  // Reset tab config to new defaults
  const resetConfig = useCallback(async () => {
    if (!confirm('タブ設定をデフォルトにリセットしますか？\n※ タブ構成のみリセットされます。調書の内容は消えません。')) return
    setLoadingConfig(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/tab-config`, { method: 'DELETE' })
      if (res.ok) {
        const config: TabConfig = await res.json()
        applyConfig(config)
      }
    } finally {
      setLoadingConfig(false)
    }
  }, [project.id])

  // Save tab config to API (debounced)
  const saveConfig = useCallback(
    async (newConfig: TabConfig) => {
      await fetch(`/api/projects/${project.id}/tab-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })
    },
    [project.id]
  )

  // Load workpaper when L3 selection changes
  useEffect(() => {
    if (!selectedL1 || !selectedL2 || !selectedL3 || !tabConfig) {
      setWorkpaper(null)
      setEditorContent(null)
      return
    }

    async function loadWorkpaper() {
      setLoadingWorkpaper(true)
      setWorkpaper(null)
      setEditorContent(null)

      const l1tab = tabConfig!.layer1.find(t => t.id === selectedL1)
      const l2tab = (tabConfig!.layer2[selectedL1] ?? []).find(t => t.id === selectedL2)
      const l3tab = (tabConfig!.layer3[`${selectedL1}__${selectedL2}`] ?? []).find(t => t.id === selectedL3)
      if (!l1tab || !l2tab || !l3tab) return

      try {
        const res = await fetch('/api/workpapers/by-tab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: project.id,
            tab_layer1_id: selectedL1,
            tab_layer2_id: selectedL2,
            tab_layer3_id: selectedL3,
            title: `${l2tab.title} ${l3tab.title}`,
            workpaper_number: l3tab.title,
          }),
        })
        if (res.ok) {
          const wp: Workpaper = await res.json()
          setWorkpaper(wp)
          setEditorContent(wp.content)
        }
      } finally {
        setLoadingWorkpaper(false)
      }
    }

    loadWorkpaper()
  }, [selectedL1, selectedL2, selectedL3, tabConfig, project.id])

  const handleSave = useCallback(
    async (content: Record<string, unknown>) => {
      if (!workpaper) return
      await fetch(`/api/workpapers/${workpaper.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
    },
    [workpaper]
  )

  // ─── Tab selection helpers ───────────────────────────────────────────────
  function selectL1(id: string) {
    if (!tabConfig) return
    setSelectedL1(id)
    const l2tabs = tabConfig.layer2[id] ?? []
    const l2id = l2tabs[0]?.id ?? ''
    setSelectedL2(l2id)
    const l3tabs = l2id ? (tabConfig.layer3[`${id}__${l2id}`] ?? []) : []
    setSelectedL3(l3tabs[0]?.id ?? '')
  }

  function selectL2(id: string) {
    if (!tabConfig) return
    setSelectedL2(id)
    const l3tabs = tabConfig.layer3[`${selectedL1}__${id}`] ?? []
    setSelectedL3(l3tabs[0]?.id ?? '')
  }

  // ─── Tab CRUD ────────────────────────────────────────────────────────────
  function addL2Tab() {
    if (!tabConfig || !canEdit) return
    const existing = tabConfig.layer2[selectedL1] ?? []
    if (existing.length >= MAX_L2_TABS) return
    const newTab: TabItem = { id: crypto.randomUUID(), title: `科目${existing.length + 1}` }
    const newConfig: TabConfig = {
      ...tabConfig,
      layer2: { ...tabConfig.layer2, [selectedL1]: [...existing, newTab] },
      layer3: { ...tabConfig.layer3, [`${selectedL1}__${newTab.id}`]: [] },
    }
    setTabConfig(newConfig)
    saveConfig(newConfig)
    setSelectedL2(newTab.id)
    setSelectedL3('')
  }

  function addL3Tab() {
    if (!tabConfig || !canEdit || !selectedL2) return
    const key = `${selectedL1}__${selectedL2}`
    const existing = tabConfig.layer3[key] ?? []
    if (existing.length >= MAX_L3_TABS) return
    const newTab: TabItem = { id: crypto.randomUUID(), title: `調書${existing.length + 1}` }
    const newConfig: TabConfig = {
      ...tabConfig,
      layer3: { ...tabConfig.layer3, [key]: [...existing, newTab] },
    }
    setTabConfig(newConfig)
    saveConfig(newConfig)
    setSelectedL3(newTab.id)
  }

  function deleteL2Tab(id: string) {
    if (!tabConfig || !canEdit) return
    const existing = (tabConfig.layer2[selectedL1] ?? []).filter(t => t.id !== id)
    const newLayer3 = { ...tabConfig.layer3 }
    delete newLayer3[`${selectedL1}__${id}`]
    const newConfig: TabConfig = {
      ...tabConfig,
      layer2: { ...tabConfig.layer2, [selectedL1]: existing },
      layer3: newLayer3,
    }
    setTabConfig(newConfig)
    saveConfig(newConfig)
    if (selectedL2 === id) {
      const next = existing[0]
      setSelectedL2(next?.id ?? '')
      const l3s = next ? (newConfig.layer3[`${selectedL1}__${next.id}`] ?? []) : []
      setSelectedL3(l3s[0]?.id ?? '')
    }
  }

  function deleteL3Tab(id: string) {
    if (!tabConfig || !canEdit || !selectedL2) return
    const key = `${selectedL1}__${selectedL2}`
    const existing = (tabConfig.layer3[key] ?? []).filter(t => t.id !== id)
    const newConfig: TabConfig = {
      ...tabConfig,
      layer3: { ...tabConfig.layer3, [key]: existing },
    }
    setTabConfig(newConfig)
    saveConfig(newConfig)
    if (selectedL3 === id) {
      setSelectedL3(existing[0]?.id ?? '')
    }
  }

  function renameTab(layer: 1 | 2 | 3, id: string, newTitle: string) {
    if (!tabConfig || !canEdit || !newTitle.trim()) return
    let newConfig = { ...tabConfig }
    if (layer === 1) {
      newConfig.layer1 = tabConfig.layer1.map(t => t.id === id ? { ...t, title: newTitle.trim() } : t)
    } else if (layer === 2) {
      newConfig.layer2 = {
        ...tabConfig.layer2,
        [selectedL1]: (tabConfig.layer2[selectedL1] ?? []).map(t =>
          t.id === id ? { ...t, title: newTitle.trim() } : t
        ),
      }
    } else {
      const key = `${selectedL1}__${selectedL2}`
      newConfig.layer3 = {
        ...tabConfig.layer3,
        [key]: (tabConfig.layer3[key] ?? []).map(t =>
          t.id === id ? { ...t, title: newTitle.trim() } : t
        ),
      }
    }
    setTabConfig(newConfig)
    saveConfig(newConfig)
  }

  // ─── Context menu & rename ───────────────────────────────────────────────
  function handleContextMenu(e: React.MouseEvent, layer: 1 | 2 | 3, tab: TabItem) {
    if (!canEdit) return
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, layer, tabId: tab.id, tabTitle: tab.title })
  }

  function startRename(layer: 1 | 2 | 3, id: string, currentTitle: string) {
    setContextMenu(null)
    setRenameTarget({ layer, id })
    setRenameValue(currentTitle)
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }

  function commitRename() {
    if (!renameTarget) return
    renameTab(renameTarget.layer, renameTarget.id, renameValue)
    setRenameTarget(null)
  }

  // Close context menu on click outside
  useEffect(() => {
    function handler() { setContextMenu(null) }
    if (contextMenu) {
      window.addEventListener('click', handler)
      return () => window.removeEventListener('click', handler)
    }
  }, [contextMenu])

  // ─── Derived values ──────────────────────────────────────────────────────
  const l2tabs = tabConfig ? (tabConfig.layer2[selectedL1] ?? []) : []
  const l3tabs = tabConfig && selectedL2
    ? (tabConfig.layer3[`${selectedL1}__${selectedL2}`] ?? [])
    : []

  // ─── Render ──────────────────────────────────────────────────────────────
  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!tabConfig) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        タブ設定を読み込めませんでした
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* ── Layer 1 (top horizontal tabs) ── */}
      <div className="flex items-end gap-0 px-2 pt-2 bg-gray-100 border-b border-gray-300 shrink-0 overflow-x-auto">
        {tabConfig.layer1.map(tab => (
          <button
            key={tab.id}
            onClick={() => selectL1(tab.id)}
            onContextMenu={e => handleContextMenu(e, 1, tab)}
            className={`
              relative px-4 py-2 text-sm font-medium rounded-t-md border border-b-0 mr-1 whitespace-nowrap
              transition-colors duration-150 select-none
              ${selectedL1 === tab.id
                ? 'bg-white border-gray-300 text-blue-700 z-10 -mb-px'
                : 'bg-gray-200 border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            {renameTarget?.layer === 1 && renameTarget.id === tab.id ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenameTarget(null) }}
                className="w-24 px-1 border border-blue-400 rounded outline-none text-gray-900 bg-white"
                onClick={e => e.stopPropagation()}
              />
            ) : tab.title}
          </button>
        ))}
        {/* Reset button — shown to creators/admins, right side of L1 tab bar */}
        {canEdit && (
          <button
            onClick={resetConfig}
            title="タブ設定をデフォルトにリセット"
            className="ml-auto mb-0 self-center mr-2 flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3 w-3" />
            リセット
          </button>
        )}
      </div>

      {/* ── Main area: Layer 2 (left) + right panel ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Layer 2 (left vertical tabs) ── */}
        <div className="flex flex-col w-44 shrink-0 border-r border-gray-200 bg-gray-50 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {l2tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => selectL2(tab.id)}
                onContextMenu={e => handleContextMenu(e, 2, tab)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 text-sm text-left
                  border-b border-gray-200 transition-colors duration-150 select-none group
                  ${selectedL2 === tab.id
                    ? 'bg-white text-blue-700 font-medium border-l-2 border-l-blue-500'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-l-2 border-l-transparent'
                  }
                `}
              >
                {renameTarget?.layer === 2 && renameTarget.id === tab.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenameTarget(null) }}
                    className="flex-1 px-1 border border-blue-400 rounded outline-none text-gray-900 bg-white text-sm"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate">{tab.title}</span>
                )}
              </button>
            ))}
          </div>
          {/* Add L2 tab button */}
          {canEdit && l2tabs.length < MAX_L2_TABS && (
            <button
              onClick={addL2Tab}
              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 border-t border-gray-200 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              科目を追加
            </button>
          )}
        </div>

        {/* ── Right panel: Layer 3 + editor ── */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Layer 3 (horizontal tabs at top of right panel) */}
          <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200 shrink-0 overflow-x-auto">
            {l3tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedL3(tab.id)}
                onContextMenu={e => handleContextMenu(e, 3, tab)}
                className={`
                  flex items-center gap-1 px-3 py-1 text-xs rounded-full border whitespace-nowrap
                  transition-colors duration-150 select-none
                  ${selectedL3 === tab.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                {renameTarget?.layer === 3 && renameTarget.id === tab.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenameTarget(null) }}
                    className="w-16 px-1 border border-blue-300 rounded outline-none text-gray-900 bg-white text-xs"
                    onClick={e => e.stopPropagation()}
                  />
                ) : tab.title}
              </button>
            ))}
            {canEdit && l3tabs.length < MAX_L3_TABS && selectedL2 && (
              <button
                onClick={addL3Tab}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-blue-600 rounded-full border border-dashed border-gray-300 hover:border-blue-400 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Editor area */}
          <div className="flex-1 overflow-y-auto">
            {loadingWorkpaper ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            ) : !selectedL3 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <FileText className="h-10 w-10 text-gray-300" />
                <p className="text-sm">調書タブを選択してください</p>
              </div>
            ) : workpaper ? (
              <div className="flex flex-col h-full">
                {/* Workpaper metadata bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(workpaper.status)}`}>
                    {STATUS_LABELS[workpaper.status]}
                  </span>
                  <Link
                    href={`/workpapers/${workpaper.id}`}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    詳細・査閲 →
                  </Link>
                </div>
                {/* Editor */}
                <div className="flex-1 overflow-y-auto">
                  <RichTextEditor
                    content={editorContent}
                    onChange={setEditorContent}
                    onSave={handleSave}
                    readOnly={project.status === 'locked' || !canEdit}
                    placeholder="調書の内容を入力してください..."
                    workpaperId={workpaper.id}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <FileText className="h-10 w-10 text-gray-300" />
                <p className="text-sm">調書を読み込めませんでした</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Context menu ── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-36"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => startRename(contextMenu.layer, contextMenu.tabId, contextMenu.tabTitle)}
          >
            名前を変更
          </button>
          {contextMenu.layer === 2 && (
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={() => { deleteL2Tab(contextMenu.tabId); setContextMenu(null) }}
            >
              削除
            </button>
          )}
          {contextMenu.layer === 3 && (
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={() => { deleteL3Tab(contextMenu.tabId); setContextMenu(null) }}
            >
              削除
            </button>
          )}
        </div>
      )}
    </div>
  )
}
