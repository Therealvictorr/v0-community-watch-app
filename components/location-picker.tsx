'use client'
import {useMemo,useState} from 'react'
import dynamic from 'next/dynamic'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
const Map=dynamic(()=>import('@/components/case-map').then(m=>m.CaseMap),{ssr:false,loading:()=> <div className="h-[380px] rounded border p-5">Loading map…</div>})
interface Place{name:string;lat:number;lng:number;state:string;locality:string}
export function LocationPicker({latitude,longitude,onPick}:{latitude:string;longitude:string;onPick:(p:Place)=>void}){
 const [query,setQuery]=useState(''),[results,setResults]=useState<Place[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const point=useMemo(()=>latitude!==''&&longitude!==''?{lat:Number(latitude),lng:Number(longitude)}:undefined,[latitude,longitude])
 async function search(){setBusy(true);setError('');setResults([]);try{const response=await fetch('/api/places?q='+encodeURIComponent(query));const data=await response.json();if(!response.ok)throw new Error(data.error);setResults(data.places);if(!data.places.length)setError('No places found. Try a town or use the map.')}catch(e){setError(e instanceof Error?e.message:'Search unavailable.')}finally{setBusy(false)}}
 return <div className="space-y-3"><div className="flex gap-2"><label className="flex-1 text-sm">Search a town or place<Input value={query} minLength={3} maxLength={120} onChange={e=>setQuery(e.target.value)} placeholder="e.g., Chikun, Kaduna" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(query.trim().length>=3&&!busy)search()}}}/></label><Button type="button" variant="outline" className="self-end" disabled={busy||query.trim().length<3} onClick={search}>{busy?'Searching…':'Search'}</Button></div>{error&&<p role="status" className="text-sm">{error}</p>}{!!results.length&&<ul className="border rounded divide-y">{results.map((p,i)=><li key={i}><button type="button" className="p-3 text-left text-sm w-full hover:bg-muted" onClick={()=>{onPick(p);setResults([])}}>{p.name}</button></li>)}</ul>}<Map point={point} onPick={p=>onPick({...p,name:'',state:'',locality:''})}/><p className="text-xs text-muted-foreground">Search © OpenStreetMap contributors. Search runs only when submitted, not while typing.</p></div>
}