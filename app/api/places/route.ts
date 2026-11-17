import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {isSupabaseConfigured} from '@/lib/supabase/env'
export async function GET(request:Request){
 const q=new URL(request.url).searchParams.get('q')?.trim()||''
 if(q.length<3||q.length>120)return NextResponse.json({error:'Enter a place name between 3 and 120 characters.'},{status:400})
 if(!isSupabaseConfigured())return NextResponse.json({error:'Place search requires the database connection. You can use the map or enter an area manually.'},{status:503})
 const client=await createClient(),{data:allowed,error}=await client.rpc('idanu_geocoding_lease')
 if(error)return NextResponse.json({error:'Place search is unavailable. Install the location migration or enter an area manually.'},{status:503})
 if(!allowed)return NextResponse.json({error:'Place search is busy. Wait a moment and search again.'},{status:429,headers:{'Retry-After':'2'}})
 const url=new URL('search',process.env.GEOCODING_BASE_URL||'https://nominatim.openstreetmap.org/')
 url.searchParams.set('q',q);url.searchParams.set('format','jsonv2');url.searchParams.set('addressdetails','1');url.searchParams.set('limit','5')
 try{
 const response=await fetch(url,{headers:{'User-Agent':'Idanu/1.0 (community case reporting)','Accept-Language':'en'},next:{revalidate:86400},signal:AbortSignal.timeout(10000)})
 if(!response.ok)throw new Error('Search unavailable')
 const data=await response.json()
 return NextResponse.json({places:data.map((p:any)=>({name:p.display_name,lat:Number(Number(p.lat).toFixed(2)),lng:Number(Number(p.lon).toFixed(2)),state:p.address?.state||p.address?.region||'',locality:p.address?.city||p.address?.town||p.address?.village||p.address?.county||''})),attribution:'© OpenStreetMap contributors'})
 }catch{return NextResponse.json({error:'Place search is unavailable. Use the map or enter an area manually.'},{status:502})}
}