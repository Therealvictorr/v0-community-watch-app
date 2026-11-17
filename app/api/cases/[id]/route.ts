import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/case-access'
import { z } from 'zod'
const input = z.discriminatedUnion('action', [
  z.object({action:z.literal('follow'), enabled:z.boolean()}),
  z.object({action:z.literal('flag'), reason:z.string().trim().min(10).max(1000)}),
  z.object({action:z.literal('check-in')}),
  z.object({action:z.literal('review'), decision:z.enum(['approved','hidden','rejected','duplicate','verified','disputed']), note:z.string().trim().min(10).max(1000), duplicate_id:z.string().uuid().nullable().optional()}),
  z.object({action:z.literal('correct'), subject:z.string().trim().min(3).max(200), description:z.string().trim().max(5000), case_kind:z.enum(['missing','reported_kidnapping']).optional()}),
])
export async function POST(request: Request, {params}: {params:Promise<{id:string}>}) {
  const {id} = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({error:'Invalid case ID.'},{status:400})
  let parsed
  try { parsed = input.safeParse(await request.json()) } catch { return NextResponse.json({error:'Invalid request.'},{status:400}) }
  if (!parsed.success) return NextResponse.json({error:'Check the fields and try again.'},{status:400})
  const client = await createClient()
  const {data:{user}} = await client.auth.getUser()
  if (!user) return NextResponse.json({error:'Sign in first.'},{status:401})
  const {data:report,error:readError} = await client.from('reports').select('id,reporter_id,person_details,report_type').eq('id',id).maybeSingle()
  if (readError || !report) return NextResponse.json({error:'Case not found or unavailable.'},{status:404})
  const body = parsed.data
  let error: {message:string} | null = null
  if (body.action === 'follow') {
    if (body.enabled) ({error} = await client.from('case_follows').upsert({report_id:id,user_id:user.id},{onConflict:'report_id,user_id',ignoreDuplicates:true}))
    else ({error} = await client.from('case_follows').delete().eq('report_id',id).eq('user_id',user.id))
  } else if (body.action === 'flag') {
    ;({error} = await client.from('case_flags').insert({report_id:id,user_id:user.id,reason:body.reason}))
  } else if (body.action === 'check-in') {
    ;({error} = await client.rpc('idanu_check_in',{case_id:id}))
  } else if (body.action === 'review') {
    if (!await isAdmin(client)) return NextResponse.json({error:'Administrator access required.'},{status:403})
    ;({error} = await client.rpc('idanu_review_case',{case_id:id,decision:body.decision,note:body.note,duplicate_id:body.duplicate_id || null}))
  } else if (body.action === 'correct') {
    if (report.reporter_id !== user.id) return NextResponse.json({error:'Only the case owner can submit a correction.'},{status:403})
    const patch: Record<string,unknown> = {subject:body.subject,description:body.description}
    if (report.report_type === 'missing_child' && body.case_kind) patch.person_details = {...report.person_details,case_kind:body.case_kind}
    ;({error} = await client.from('reports').update(patch).eq('id',id).eq('reporter_id',user.id))
  }
  if (error) return NextResponse.json({error: error.message.includes('duplicate key') ? 'You have already submitted a flag for this case.' : 'Action could not be saved. Please try again later.'},{status:400})
  return NextResponse.json({success:true})
}
