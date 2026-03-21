'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { UserPlus } from 'lucide-react'
import { InviteUserModal } from './InviteUserModal'

export function InviteButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <UserPlus className="h-4 w-4" />
        ユーザーを招待
      </Button>
      <InviteUserModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
