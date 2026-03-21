'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Mail, UserPlus } from 'lucide-react'
import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/types'

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  creator: '調書の作成・編集・作成者チェック',
  reviewer: '調書の査閲・査閲者チェック',
  admin: '全権限 + プロジェクト管理・ユーザー管理',
}

export function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('creator')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleClose = () => {
    setEmail('')
    setRole('creator')
    setError(null)
    setSuccess(false)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '招待の送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="ユーザーを招待" size="md">
      {success ? (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
            <Mail className="h-7 w-7 text-green-600" />
          </div>
          <p className="font-medium text-gray-900 mb-1">招待メールを送信しました</p>
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-medium">{email}</span> に招待リンクを送信しました。
            <br />
            リンクの有効期限は7日間です。
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleClose}>
              閉じる
            </Button>
            <Button
              onClick={() => {
                setEmail('')
                setRole('creator')
                setError(null)
                setSuccess(false)
              }}
            >
              続けて招待する
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Input
            label="メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
            required
            autoComplete="off"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              権限<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={role === value}
                    onChange={() => setRole(value)}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{label}</div>
                    <div className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[value]}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              キャンセル
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              <UserPlus className="h-4 w-4" />
              招待メールを送信
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
