import { Badge } from '@/components/ui/Badge'
import type { WorkpaperStatus } from '@/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/types'

interface StatusBadgeProps {
  status: WorkpaperStatus
  className?: string
}

type BadgeColor = 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'orange'

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = STATUS_LABELS[status]
  const color = STATUS_COLORS[status] as BadgeColor

  return (
    <Badge color={color} className={className}>
      {label}
    </Badge>
  )
}
