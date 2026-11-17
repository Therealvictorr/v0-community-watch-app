'use client'
import dynamic from 'next/dynamic'
import type {Report} from '@/lib/types'
import {validPoint} from '@/lib/location'
const Map=dynamic(()=>import('@/components/case-map').then(m=>m.CaseMap),{ssr:false,loading:()=> <div className="h-[380px] border rounded p-5">Loading map…</div>})
export function CaseLocationMap({report}:{report:Report}){if(!validPoint(report.last_seen_lat,report.last_seen_lng))return <div className="rounded-lg border p-8 text-center"><p>{report.last_seen_location||'Last-seen area not specified.'}</p><p className="text-sm text-muted-foreground mt-2">This case has no map coordinates. No location has been guessed.</p></div>;return <Map reports={[report]}/>}