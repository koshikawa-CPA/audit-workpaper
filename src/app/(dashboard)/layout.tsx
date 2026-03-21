import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Profile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  let currentProfile = profile as Profile | null

  if (!currentProfile) {
    // Fallback: trigger may have failed silently — create profile here
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({
        id: user!.id,
        email: user!.email ?? '',
        full_name: user!.user_metadata?.full_name
          || user!.email?.split('@')[0]
          || 'ユーザー',
        role: 'creator', // Always default to creator for safety
      })
      .select()
      .single()

    if (!newProfile) {
      redirect('/login')
    }
    currentProfile = newProfile as Profile
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={currentProfile!} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
