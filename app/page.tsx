import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { mockReports } from '@/lib/mock-data'
import { Header } from '@/components/header'
import { CaseDashboard } from '@/components/case-dashboard'
import type { Report } from '@/lib/types'

export default async function HomePage() {
  if (!isSupabaseConfigured()) return <><Header user={null} /><CaseDashboard reports={mockReports} demo /></>
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Fetch all pages so totals never silently describe only the first database page.
  const reports: Report[] = []
  let failed = false
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('reports')
      .select('id,vcon_uuid,report_type,status,subject,description,person_details,item_details,last_seen_location,last_seen_lat,last_seen_lng,last_seen_at,created_at,updated_at,reporter_id,moderation_status,outcome_verification,incident_id')
      .eq('moderation_status','approved')
      .in('report_type', ['missing_child', 'missing_item'])
      .order('created_at', { ascending: false }).order('id').range(offset, offset + 499)
    if (error) { failed = true; break }
    reports.push(...(data || []))
    if (!data || data.length < 500) break
  }
  return <><Header user={user} /><CaseDashboard reports={failed ? [] : reports} failed={failed} /></>
}
