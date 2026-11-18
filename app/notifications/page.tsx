import Link from 'next/link'
import {LiveRefresh} from '@/components/live-refresh'
import {redirect} from 'next/navigation'
import {Header} from '@/components/header'
import {NotificationRead} from '@/components/notification-read'
import {createClient} from '@/lib/supabase/server'
import {isSupabaseConfigured} from '@/lib/supabase/env'
export default async function NotificationsPage(){
 if(!isSupabaseConfigured())return <main className="p-8">Connect Supabase to enable your inbox.</main>
 const client=await createClient(),{data:{user}}=await client.auth.getUser();if(!user)redirect('/auth/login')
 const {error:reminderError}=await client.rpc('idanu_refresh_reminders')
 const {data,error}=await client.from('case_notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100)
 return <><LiveRefresh/><Header user={user}/><main className="max-w-3xl mx-auto p-5 space-y-5"><h1 className="text-3xl font-bold">Your inbox</h1><p className="text-sm text-muted-foreground">Case updates and owner check-in reminders. Reminders are checked when you open this inbox; no email or SMS is sent. Showing the latest 100 notifications.</p>{(error||reminderError)&&<p role="alert">The inbox could not load completely. Please try again later.</p>}{!error&&!data?.length&&<p>No notifications yet. Follow a case to receive its updates.</p>}{data?.map(n=><article key={n.id} className={'rounded-xl border p-5 space-y-2 '+(!n.read_at?'bg-secondary':'')}><p>{n.message}</p><time className="block text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString('en-GB',{timeZone:'Africa/Lagos'})} WAT</time><div className="flex gap-5">{n.report_id&&<Link className="text-sm underline" href={'/reports/'+n.report_id}>Open case</Link>}{!n.read_at&&<NotificationRead id={n.id}/>}</div></article>)}</main></>
}