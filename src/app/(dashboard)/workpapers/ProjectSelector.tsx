'use client'

import { useRouter } from 'next/navigation'
import type { AuditProject } from '@/types'

interface ProjectSelectorProps {
  projects: AuditProject[]
  selectedProjectId: string
}

export function ProjectSelector({ projects, selectedProjectId }: ProjectSelectorProps) {
  const router = useRouter()

  return (
    <select
      value={selectedProjectId}
      onChange={e => router.push(`/workpapers?project_id=${e.target.value}`)}
      className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      {projects.map(p => (
        <option key={p.id} value={p.id}>
          {p.name}（{p.fiscal_year}）{p.status === 'locked' ? ' 🔒' : ''}
        </option>
      ))}
    </select>
  )
}
