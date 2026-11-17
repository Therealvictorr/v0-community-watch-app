'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabase/client'
export function NotificationRead({id}:{id:string}){const router=useRouter(),[error,setError]=useState(''),[busy,setBusy]=useState(false);return <><button className="text-xs underline" disabled={busy} onClick={async()=>{setBusy(true);const {error}=await createClient().rpc('idanu_read_notification',{notification_id:id});if(error)setError('Could not mark as read.');else router.refresh();setBusy(false)}}>Mark read</button>{error&&<p role="alert">{error}</p>}</>}