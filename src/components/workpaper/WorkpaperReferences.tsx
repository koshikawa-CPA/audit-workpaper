import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { ExternalLink, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

interface SimpleWorkpaper {
  id: string
  title: string
  workpaper_number: string
  status: string
}

export async function WorkpaperReferences({ workpaperId }: { workpaperId: string }) {
  const supabase = createClient()

  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase
      .from('workpaper_references')
      .select(`
        id,
        to_workpaper:workpapers!workpaper_references_to_workpaper_id_fkey(id, title, workpaper_number, status)
      `)
      .eq('from_workpaper_id', workpaperId)
      .order('created_at', { ascending: true }),
    supabase
      .from('workpaper_references')
      .select(`
        id,
        from_workpaper:workpapers!workpaper_references_from_workpaper_id_fkey(id, title, workpaper_number, status)
      `)
      .eq('to_workpaper_id', workpaperId)
      .order('created_at', { ascending: true }),
  ])

  const hasAny = (outgoing?.length ?? 0) + (incoming?.length ?? 0) > 0

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">参照関係</h2>
      </div>

      <div className="p-5 space-y-5">
        {!hasAny && (
          <p className="text-sm text-gray-400 text-center py-3">参照なし</p>
        )}

        {/* この調書を参照している調書（被参照）*/}
        {(incoming?.length ?? 0) > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-xs font-medium text-gray-500">この調書を参照している調書</p>
            </div>
            <ul className="space-y-1">
              {incoming!.map((ref) => {
                const wp = ref.from_workpaper as unknown as SimpleWorkpaper
                return (
                  <li key={ref.id}>
                    <Link
                      href={`/workpapers/${wp.id}`}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-blue-700 hover:bg-blue-50 transition-colors group"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-400 group-hover:text-blue-600" />
                      <span className="font-mono text-xs text-gray-400 shrink-0">{wp.workpaper_number}</span>
                      <span className="truncate">{wp.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* この調書が参照している調書（参照先）*/}
        {(outgoing?.length ?? 0) > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
              <p className="text-xs font-medium text-gray-500">この調書が参照している調書</p>
            </div>
            <ul className="space-y-1">
              {outgoing!.map((ref) => {
                const wp = ref.to_workpaper as unknown as SimpleWorkpaper
                return (
                  <li key={ref.id}>
                    <Link
                      href={`/workpapers/${wp.id}`}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-green-700 hover:bg-green-50 transition-colors group"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-green-400 group-hover:text-green-600" />
                      <span className="font-mono text-xs text-gray-400 shrink-0">{wp.workpaper_number}</span>
                      <span className="truncate">{wp.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
