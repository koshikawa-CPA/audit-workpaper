import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Profile } from '@/types'
import { ROLE_LABELS } from '@/types'
import { Users, Calendar, Mail, Clock } from 'lucide-react'
import { UserRoleEditor } from './UserRoleEditor'
import { InviteButton } from './InviteButton'

export const dynamic = 'force-dynamic'

interface Invitation {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
  used_at: string | null
}

export default async function UsersPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if ((profile as Profile)?.role !== 'admin') {
    redirect('/dashboard')
  }

  const [{ data: profiles }, { data: invitations }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabaseAdmin
      .from('invitations')
      .select('id, email, role, created_at, expires_at, used_at')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  const roleColors: Record<string, 'blue' | 'purple' | 'red'> = {
    creator: 'blue',
    reviewer: 'purple',
    admin: 'red',
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const pendingInvitations = (invitations ?? []) as Invitation[]

  return (
    <div>
      <Header title="ユーザー管理" profile={profile as Profile} />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {(profiles || []).length} 件のユーザー
          </p>
          <InviteButton />
        </div>

        {/* 保留中の招待 */}
        {pendingInvitations.length > 0 && (
          <Card padding="none">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-medium text-gray-700">
                  招待待ち ({pendingInvitations.length}件)
                </h3>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center">
                      <Mail className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{inv.email}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Clock className="h-3 w-3" />
                        有効期限: {formatDate(inv.expires_at)}
                      </div>
                    </div>
                  </div>
                  <Badge color={roleColors[inv.role] ?? 'gray'}>
                    {ROLE_LABELS[inv.role as keyof typeof ROLE_LABELS]}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Role legend */}
        <Card padding="md">
          <h3 className="text-sm font-medium text-gray-700 mb-3">ロール説明</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-800 mb-1">作成者（Creator）</div>
              <p className="text-blue-600 text-xs">
                調書の作成・編集・作成者チェックが可能
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="font-medium text-purple-800 mb-1">
                査閲者（Reviewer）
              </div>
              <p className="text-purple-600 text-xs">
                調書の査閲・査閲者チェックが可能
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="font-medium text-red-800 mb-1">管理者（Admin）</div>
              <p className="text-red-600 text-xs">
                全権限 + プロジェクト管理・ユーザー管理・ロック操作
              </p>
            </div>
          </div>
        </Card>

        {/* Users table */}
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メールアドレス
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ロール
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(profiles || []).map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 shrink-0">
                          {p.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {p.full_name}
                          </p>
                          {p.id === user.id && (
                            <span className="text-xs text-gray-400">（自分）</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.email}</td>
                    <td className="px-6 py-4">
                      <Badge color={roleColors[p.role] || 'gray'}>
                        {ROLE_LABELS[p.role as keyof typeof ROLE_LABELS]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(p.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.id !== user.id ? (
                        <UserRoleEditor
                          userId={p.id}
                          currentRole={p.role}
                          userName={p.full_name}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">変更不可</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
