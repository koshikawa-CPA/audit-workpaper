'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/types'

interface UserRoleEditorProps {
  userId: string
  currentRole: string
  userName: string
}

export function UserRoleEditor({
  userId,
  currentRole,
  userName,
}: UserRoleEditorProps) {
  const [role, setRole] = useState<UserRole>(currentRole as UserRole)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleChange = async (newRole: UserRole) => {
    if (
      !confirm(
        `${userName} のロールを「${ROLE_LABELS[newRole]}」に変更しますか？`
      )
    )
      return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setRole(newRole)
      router.refresh()
    } catch (err) {
      alert('ロールの変更に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value as UserRole)}
      disabled={loading}
      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
    >
      {Object.entries(ROLE_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
}
