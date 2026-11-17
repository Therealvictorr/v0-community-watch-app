'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
interface Props { reportId: string; currentStatus: string; reportCreatorId: string; onStatusUpdated?: () => void; isAdmin?: boolean; userId?: string | null }
export function ReportStatusManager({ reportId, currentStatus, reportCreatorId, userId, onStatusUpdated }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [area, setArea] = useState('')
  const [stateArea,setStateArea] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/reports/'+reportId+'/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, outcome_location: area, outcome_state: stateArea, confirmed }) })
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Could not update case.') }
      router.refresh(); onStatusUpdated?.()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update case.') } finally { setBusy(false) }
  }
  return <Card><CardHeader><CardTitle>Update the case</CardTitle></CardHeader><CardContent className="space-y-4">{!userId || userId !== reportCreatorId ? <p className="text-sm text-muted-foreground">Only the case owner can change its outcome.</p> : <>
    <label className="block text-sm">Case status<select className="mt-2 w-full border rounded-md p-3" value={status} onChange={e => {setStatus(e.target.value);setConfirmed(false)}}><option value="active">Still missing / reopen case</option><option value="resolved">Report found / recovered</option><option value="closed">Close · outcome unconfirmed</option></select></label>
    {status === 'resolved' && <><label className="block text-sm">Found / recovered state or region (optional, public)<Input maxLength={100} value={stateArea} onChange={e=>setStateArea(e.target.value)} placeholder="e.g., Kaduna" /></label><label className="block text-sm">Found / recovered area (optional, public)<Input className="mt-2" maxLength={120} placeholder="Town or state only; no exact address" value={area} onChange={e => setArea(e.target.value)} /></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I have confirmed this person or belonging has been found. This does not automatically mean the person was found safe.</label></>}
    <p className="text-xs text-muted-foreground">Closing a case does not count it as found. Found updates are attributed to the case owner.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={busy || status === currentStatus || (status === 'resolved' && !confirmed)} onClick={save}>{busy ? 'Saving…' : 'Save update'}</Button>
  </>}</CardContent></Card>
}
