import { FileText, Clock, Search, CheckCircle, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { DashboardStats } from '@/types'

interface StatsCardsProps {
  stats: DashboardStats
}

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  subtitle?: string
}

function StatCard({ title, value, icon: Icon, color, bgColor, subtitle }: StatCardProps) {
  return (
    <Card padding="md" className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${bgColor} shrink-0`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </Card>
  )
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <StatCard
        title="総調書数"
        value={stats.total_workpapers}
        icon={FileText}
        color="text-blue-600"
        bgColor="bg-blue-50"
      />
      <StatCard
        title="未着手"
        value={stats.not_started}
        icon={Clock}
        color="text-gray-600"
        bgColor="bg-gray-50"
      />
      <StatCard
        title="作成中"
        value={stats.in_progress}
        icon={FileText}
        color="text-blue-600"
        bgColor="bg-blue-50"
      />
      <StatCard
        title="査閲待ち"
        value={stats.pending_review}
        icon={Search}
        color="text-yellow-600"
        bgColor="bg-yellow-50"
      />
      <StatCard
        title="完了"
        value={stats.completed}
        icon={CheckCircle}
        color="text-green-600"
        bgColor="bg-green-50"
        subtitle={`完了率: ${stats.completion_rate.toFixed(0)}%`}
      />
    </div>
  )
}
