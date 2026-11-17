import {createClient} from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({path:'.env.local'})
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if(!url||!key){console.log(JSON.stringify({configured:false}));process.exit(1)}
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options={})=>fetch(url,{...options,signal:AbortSignal.timeout(10000)})}})
const checks=await Promise.all([
 client.from('reports').select('id,moderation_status,outcome_verification,incident_id').limit(0),
 client.rpc('idanu_is_admin'),
 client.from('case_notifications').select('id').limit(0)
])
console.log(JSON.stringify({configured:true,schemaReady:checks[0].error?null:true,roleFunctionReady:checks[1].error?null:true,inboxReady:checks[2].error?null:true,errorCodes:checks.map(r=>r.error ? (r.error.code || 'NETWORK_OR_FETCH_ERROR') : null)},null,2))
process.exit(checks.some(r=>r.error)?1:0)