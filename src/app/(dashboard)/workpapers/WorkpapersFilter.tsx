'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { Search, X } from 'lucide-react'
import type { AuditProject } from '@/types'
import { STATUS_LABELS } from '@/types'

interface WorkpapersFilterProps {
  projects: AuditProject[]
  currentFilters: {
    project_id?: string
    status?: string
    search?: string
  }
}

export function WorkpapersFilter({ projects, currentFilters }: WorkpapersFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(currentFilters.search || '')

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams()
    if (currentFilters.project_id) params.set('project_id', currentFilters.project_id)
    if (currentFilters.status) params.set('status', currentFilters.status)
    if (search) params.set('search', search)

    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilter('search', search)
  }

  const clearAll = () => {
    setSearch('')
    router.push(pathname)
  }

  const hasFilters =
    currentFilters.project_id || currentFilters.status || currentFilters.search

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-48">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="調書番号、タイトル、カテゴリで検索..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </form>

        {/* Project filter */}
        <select
          value={currentFilters.project_id || ''}
          onChange={(e) => updateFilter('project_id', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">すべてのプロジェクト</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.fiscal_year})
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={currentFilters.status || ''}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">すべてのステータス</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <X className="h-4 w-4" />
            クリア
          </button>
        )}
      </div>
    </div>
  )
}
