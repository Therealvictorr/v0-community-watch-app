'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
export function AdminReview({id}:{id:string}){
 const router=useRouter(),[decision,setDecision]=useState('approved'),[note,setNote]=useState(''),[duplicate,setDuplicate]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 return <form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const res=await fetch('/api/cases/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'review',decision,note,duplicate_id:decision==='duplicate'?duplicate:null})});const body=await res.json();if(!res.ok)throw new Error(body.error);setMessage('Review saved.');router.refresh()}catch(e){setMessage(e instanceof Error?e.message:'Could not save review.')}finally{setBusy(false)}}}>
 <label className="block text-sm">Review decision<select className="block rounded border p-2 w-full" value={decision} onChange={e=>setDecision(e.target.value)}><option value="approved">Approve publication</option><option value="hidden">Hide from public view</option><option value="rejected">Reject report</option><option value="duplicate">Mark as duplicate</option><option value="verified">Verify found / recovered outcome</option><option value="disputed">Dispute found / recovered outcome</option></select></label>
 {decision==='duplicate'&&<label className="block text-sm">Original approved case UUID<Input value={duplicate} onChange={e=>setDuplicate(e.target.value)} required /></label>}
 <label className="block text-sm">Review note / basis for decision (private)<Textarea required minLength={10} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} /></label><p className="text-xs text-muted-foreground">Verify an outcome only after independently checking with an authorized contact. Keep evidence and personal details out of public descriptions.</p><Button disabled={busy}>{busy?'Saving…':'Save review'}</Button>{message&&<p role="status" className="text-sm">{message}</p>}</form>
}