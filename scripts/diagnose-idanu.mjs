import {createClient} from '@supabase/supabase-js'
import dotenv from 'dotenv'
import dns from 'node:dns/promises'
dotenv.config({path:'.env.local'})
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const clean=s=>String(s||'').replaceAll(key||'DO_NOT_MATCH','[key]').replaceAll(url||'DO_NOT_MATCH','[project]')
try{await dns.lookup(new URL(url).hostname);console.log('DNS: resolved')}catch(e){console.log('DNS:',e.code||e.name)}
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(u,o={})=>fetch(u,{...o,signal:AbortSignal.timeout(15000)})}})
for(const [label,query] of [
 ['homepage',()=>client.from('reports').select('id,vcon_uuid,report_type,status,subject,description,person_details,item_details,last_seen_location,last_seen_lat,last_seen_lng,last_seen_at,created_at,updated_at,reporter_id,moderation_status,outcome_verification,incident_id').eq('moderation_status','approved').in('report_type',['missing_child','missing_item']).order('created_at',{ascending:false}).order('id').range(0,0)],
 ['roles',()=>client.rpc('idanu_is_admin')]
]){const r=await query();console.log(JSON.stringify({check:label,status:r.status,code:r.error?.code,message:clean(r.error?.message),details:clean(r.error?.details),rowCount:Array.isArray(r.data)?r.data.length:undefined}))}