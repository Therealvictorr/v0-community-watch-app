import Link from 'next/link'
import {notFound} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {isSupabaseConfigured} from '@/lib/supabase/env'
import {isAdmin,signedAttachments} from '@/lib/case-access'
import {mockReports,mockSightings} from '@/lib/mock-data'
import {Header} from '@/components/header'
import {ReportDetailsClient} from '@/components/report-details-client'
import {CaseActions} from '@/components/case-actions'
import {buildVconObject} from '@/lib/vcon'
export default async function Details({params}:{params:Promise<{id:string}>}){
 const {id}=await params
 if(!isSupabaseConfigured()){
 const report=mockReports.find(r=>r.id===id);if(!report)notFound();const sightings=mockSightings.filter(s=>s.report_id===id)
 return <><Header user={null}/><main className="max-w-4xl mx-auto p-5"><ReportDetailsClient report={report} sightings={sightings} vcon={buildVconObject({report,sightings,attachments:report.attachments||[]})} userId={null}/></main></>
 }
 const client=await createClient(),{data:{user}}=await client.auth.getUser()
 const {data:report,error}=await client.from('reports').select('*,attachments:report_attachments(*)').eq('id',id).maybeSingle()
 if(error)return <><Header user={user}/><main className="p-8"><h1 className="text-xl">Case unavailable</h1><p>We could not load this case. Please try again later.</p></main></>
 if(!report)notFound()
 const admin= user ? await isAdmin(client) : false
 const {data:tips,error:tipError}=user?await client.from('sightings').select('*').eq('report_id',id).order('sighted_at',{ascending:false}):{data:[],error:null}
 const sightings=(tips||[]).filter(s=>user&&(admin||report.reporter_id===user.id||s.reporter_id===user.id))
 report.attachments=await signedAttachments(client,report.attachments)
 const {data:follow}=user?await client.from('case_follows').select('report_id').eq('report_id',id).eq('user_id',user.id).maybeSingle():{data:null}
 const {data:contact}=(user&&(admin||report.reporter_id===user.id))?await client.from('case_contacts').select('*').eq('report_id',id).maybeSingle():{data:null}
 const {data:related}=report.incident_id?await client.from('reports').select('id,subject,status').eq('incident_id',report.incident_id).neq('id',id):{data:[]}
 const {data:history}=(user&&(admin||report.reporter_id===user.id))?await client.from('case_audit').select('id,action,note,created_at').eq('report_id',id).order('created_at',{ascending:false}).limit(30):{data:[]}
 return <><Header user={user}/><main className="max-w-4xl mx-auto p-5 space-y-5">
 {report.moderation_status!=='approved'&&<p className="rounded border bg-amber-50 p-4 text-sm">Publication: {report.moderation_status}. This case is not shown on the public case board.</p>}
 {tipError&&<p role="alert" className="text-sm">Your sighting inbox could not load. Please retry.</p>}
 {contact&&<section className="rounded border p-4 text-sm"><h2 className="font-semibold">Private case contact</h2><p>{[contact.contact_name,contact.contact_phone,contact.contact_email].filter(Boolean).join(' · ')||'No contact details supplied.'}</p></section>}
 <ReportDetailsClient report={report} sightings={sightings} vcon={buildVconObject({report,sightings,attachments:report.attachments})} userId={user?.id||null}/>
 <CaseActions report={report} userId={user?.id||null} following={!!follow}/>
 {!!related?.length&&<section className="border p-4 rounded space-y-3"><h2 className="font-semibold">People linked to the same incident</h2>{related.map(r=><p key={r.id}><Link className="underline" href={'/reports/'+r.id}>{r.subject}</Link> · {r.status}</p>)}</section>}
 {!!history?.length&&<section className="border p-4 rounded space-y-3"><h2 className="font-semibold">Private case history</h2>{history.map(h=><div key={h.id} className="text-sm"><p>{h.action}</p><p>{h.note}</p><time>{new Date(h.created_at).toLocaleString('en-GB',{timeZone:'Africa/Lagos'})} WAT</time></div>)}</section>}
 </main></>
}