import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { AdminReview } from '@/components/admin-review'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { isAdmin } from '@/lib/case-access'
export default async function AdminPage(){
 if(!isSupabaseConfigured())return <main className="p-8">Connect Supabase and apply the launch migration to enable administration.</main>
 const client=await createClient(),{data:{user}}=await client.auth.getUser()
 if(!user)redirect('/auth/login')
 if(!await isAdmin(client))return <><Header user={user}/><main className="max-w-3xl mx-auto p-8"><h1 className="text-2xl font-bold">Administrator access required</h1><p className="mt-3">Use the verified administrator account. Access cannot be enabled from a profile.</p></main></>
 const {data:reports,error}=await client.from('reports').select('*').or('moderation_status.eq.pending,outcome_verification.eq.pending').order('created_at').limit(100)
 const {data:flags,error:flagError}=await client.from('case_flags').select('*,reports(id,subject)').eq('status','open').order('created_at').limit(100)
 const ids=[...new Set([...(reports||[]).map(r=>r.id),...(flags||[]).map(f=>f.report_id)])]
 const {data:flagged}=ids.length?await client.from('reports').select('*').in('id',ids):{data:[]}
 const {data:contacts}=ids.length?await client.from('case_contacts').select('*').in('report_id',ids):{data:[]}
 const {data:audit}=await client.from('case_audit').select('*').order('created_at',{ascending:false}).limit(30)
 return <><Header user={user}/><main className="max-w-5xl mx-auto p-5 space-y-6"><h1 className="text-3xl font-bold">Review desk</h1><p className="text-sm text-muted-foreground">Pending publication, found outcomes, and flags. Up to 100 queued cases and flags are shown; refresh after completing reviews.</p>{(error||flagError)&&<p role="alert">The review queue could not load. Apply the launch migration and retry.</p>}{!error&&!flagError&&!ids.length&&<p>No cases need review.</p>}
 {(flagged||[]).map(r=><article className="border rounded-xl p-5 space-y-4" key={r.id}><h2 className="text-xl font-semibold"><Link className="underline" href={'/reports/'+r.id}>{r.subject}</Link></h2><p className="text-sm">{r.id} · {r.moderation_status} · outcome {r.outcome_verification}</p><p>{r.description}</p>{(contacts||[]).filter(c=>c.report_id===r.id).map(c=><p key={c.report_id} className="text-sm">Private contact: {[c.contact_name,c.contact_phone,c.contact_email].filter(Boolean).join(' · ')||'Not supplied'}</p>)}{(flags||[]).filter(f=>f.report_id===r.id).map(f=><p className="rounded bg-amber-50 p-3 text-sm" key={f.id}>Flag: {f.reason}</p>)}<AdminReview id={r.id}/></article>)}
 <section className="border rounded-xl p-5 space-y-3"><h2 className="text-xl font-semibold">Recent audit history</h2>{(audit||[]).map(a=><div key={a.id} className="text-sm border-b pb-2"><Link className="underline" href={'/reports/'+a.report_id}>{a.report_id}</Link><p>{a.action} · {a.note}</p><time>{new Date(a.created_at).toLocaleString('en-GB',{timeZone:'Africa/Lagos'})} WAT</time></div>)}</section></main></>
}