'use client'

import { Bell, Search } from 'lucide-react'
import type { Profile } from '@/types'

interface HeaderProps {
  title: string
  profile?: Profile
}

export function Header({ title, profile }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-sm text-gray-500">
              {profile.full_name}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
