import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to update a case.' }, { status: 401 })
  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  if (!body || !['active', 'resolved', 'closed'].includes(body.status) || (body.outcome_location != null && (typeof body.outcome_location !== 'string' || body.outcome_location.length > 120))) return NextResponse.json({ error: 'Invalid status or outcome area.' }, { status: 400 })
  if (body.outcome_state != null && (typeof body.outcome_state !== 'string' || body.outcome_state.length > 100)) return NextResponse.json({error:'Invalid found state / region.'},{status:400})
  if (body.status === 'resolved' && body.confirmed !== true) return NextResponse.json({ error: 'Confirm the person or belonging has been found.' }, { status: 400 })
  const { data: report, error: readError } = await supabase.from('reports').select('reporter_id,report_type,person_details,item_details').eq('id', id).single()
  if (readError || !report) return NextResponse.json({ error: 'Case not found.' }, { status: 404 })
  if (report.reporter_id !== user.id) return NextResponse.json({ error: 'Only the case owner can update this case.' }, { status: 403 })
  const field = report.report_type === 'missing_item' ? 'item_details' : 'person_details'
  const now = new Date().toISOString()
  const details = { ...(report[field] || {}), outcome_location: body.status === 'resolved' ? body.outcome_location?.trim() || null : null, outcome_state: body.status === 'resolved' ? body.outcome_state?.trim() || null : null, outcome_confirmed_at: body.status === 'resolved' ? now : null }
  const { error } = await supabase.from('reports').update({ status: body.status, updated_at: now, [field]: details }).eq('id', id).eq('reporter_id', user.id)
  if (error) return NextResponse.json({ error: 'Could not update the case. Please try again.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
