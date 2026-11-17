'use client'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { distanceKm, validPoint } from '@/lib/location'
import Link from 'next/link'
import {LiveRefresh} from '@/components/live-refresh'
import { IdanuBrand } from '@/components/idanu-brand'
import { ArrowUpRight, Search, MapPin, Users, Package, ShieldAlert, CircleCheck, ArrowRight, Circle } from 'lucide-react'
import { areaOf, categoryOf, caseLabel, detailsOf, statusLabel, summaryOf, recoveryAreas } from '@/lib/cases'
import type { Report } from '@/lib/types'
import './case-dashboard.css'

const UnifiedMap = dynamic(() => import('@/components/case-map').then(m => m.CaseMap), { ssr: false, loading: () => <p>Loading map…</p> })
const categories = [['all', 'All cases'], ['people', 'Missing people'], ['kidnapping', 'Reported kidnappings'], ['belongings', 'Belongings'], ['found', 'Found belongings']] as const
export function CaseDashboard({ reports, demo = false, failed = false }: { reports: Report[]; demo?: boolean; failed?: boolean }) {
  const [mapView,setMapView] = useState(false)
  useEffect(() => { if(new URLSearchParams(window.location.search).get('view') === 'map') setMapView(true) }, [])
  const [near,setNear] = useState<{lat:number;lng:number}|null>(null)
  const [radius,setRadius] = useState('25')
  const [nearError,setNearError] = useState('')
  const [locationMode,setLocationMode] = useState('last-seen')
  function locateNearby(){if(!navigator.geolocation){setNearError('Location unavailable. Use the state filter.');return}navigator.geolocation.getCurrentPosition(p=>{setNear({lat:p.coords.latitude,lng:p.coords.longitude});setNearError('');setPage(1)},()=>setNearError('Location permission was denied or unavailable. Use the state filter.'),{timeout:10000,maximumAge:60000})}
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [state, setState] = useState('all')
  const [period, setPeriod] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const cases = useMemo(() => reports.filter(r => categoryOf(r) !== null && (!r.moderation_status || r.moderation_status === 'approved')), [reports])
  const areas = [...new Set(cases.map(areaOf))].sort()
  const filtered = cases.filter(r =>
    (!near || (validPoint(r.last_seen_lat,r.last_seen_lng) && distanceKm(near,{lat:r.last_seen_lat!,lng:r.last_seen_lng!}) <= Number(radius))) &&
    (category === 'all' || categoryOf(r) === category) &&
    (state === 'all' || areaOf(r) === state) &&
    (period === 'all' || new Date(r.created_at).getTime() >= Date.now() - Number(period) * 86400000) &&
    [r.subject, r.last_seen_location, areaOf(r), detailsOf(r)?.locality].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  const totals = summaryOf(filtered)
  const visible = filtered.filter(r => status === 'all' || r.status === status)
  const recoveries = recoveryAreas(filtered)
  const stats = [
    { label: 'People still missing', value: totals.people.active, icon: Users, note: 'Includes reported kidnappings' },
    { label: 'People reported found', value: totals.people.found, icon: CircleCheck, note: totals.people.rate === null ? 'No person cases in this selection' : totals.people.rate + '% of person cases in this selection' },
    { label: 'Reported kidnappings', value: totals.kidnapping.total, icon: ShieldAlert, note: totals.incidents + ' incidents / unlinked cases · ' + totals.kidnapping.active + ' still missing · ' + totals.kidnapping.found + ' reported returned' },
    { label: 'Belongings recovered', value: totals.belongings.found, icon: Package, note: totals.belongings.active + ' still missing · ' + (totals.belongings.rate === null ? 'no cases' : totals.belongings.rate + '% recovered') },
  ]
  function resetPage() { setPage(1) }
  const locations = [...new Set(filtered.map(areaOf))].map(area => {
    const rows = filtered.filter(r => areaOf(r) === area)
    return { area, rows, totals: summaryOf(rows) }
  }).sort((a, b) => b.rows.length - a.rows.length)
  return <main className="circle-app">{!demo && <LiveRefresh/>}
    {demo && <div className="circle-notice">Preview mode · Illustrative cases only. These are not real missing-person reports.</div>}
    {failed && <div role="alert" className="circle-notice">Cases could not be loaded. Statistics are unavailable. Please refresh to try again.</div>}
    <section className="circle-hero">
      <div><div className="circle-eyebrow"><span /> EVERY UPDATE BRINGS US CLOSER</div>
        <h1>Someone is looking.<br /><em>Let’s help them find.</em></h1>
        <p>A shared place for missing people, lost belongings, and the updates that matter. One case. One current story.</p>
        <div className="circle-actions"><Link className="circle-primary" href="/reports/new">Create a report <ArrowUpRight size={18} /></Link><a className="circle-secondary" href="#cases">Explore cases <ArrowRight size={17} /></a></div>
      </div>
      <aside className="circle-promise"><Circle size={38} strokeWidth={1.3} /><p>A little information.<br /><strong>A meaningful difference.</strong></p><span>Know something? Open a case to share a sighting. Check its latest status before sharing an appeal.</span><div>PEOPLE · PLACES · PEACE OF MIND</div></aside>
    </section>
    <section id="cases" className="circle-content">
      <div className="circle-section-head"><div><div className="circle-eyebrow">THE CASE BOARD</div><h2>Keep the circle informed.</h2></div><a href="#location-stats" className="circle-text-link">Location statistics <ArrowUpRight size={16} /></a></div>
      <div className="circle-filters">
        <label className="circle-search"><Search size={18} /><span className="sr-only">Search cases</span><input placeholder="Search a name, item, or place" value={query} onChange={e => {setQuery(e.target.value); resetPage()}} /></label>
        <label><span className="sr-only">State or area</span><select value={state} onChange={e => {setState(e.target.value); resetPage()}}><option value="all">All states / areas</option>{areas.map(a => <option key={a}>{a}</option>)}</select></label>
        <label><span className="sr-only">Reporting period</span><select value={period} onChange={e => {setPeriod(e.target.value); resetPage()}}><option value="all">All time</option><option value="30">Reported in last 30 days</option><option value="90">Reported in last 90 days</option><option value="365">Reported in last year</option></select></label>
      </div>
      <div className="flex flex-wrap gap-3 items-center my-4 text-sm"><button className="underline" onClick={()=>setMapView(!mapView)}>{mapView?'Show case cards':'Show case map'}</button><button className="underline" onClick={locateNearby}>Cases near me</button>{near&&<><label>Within <select aria-label="Nearby radius" value={radius} onChange={e=>{setRadius(e.target.value);resetPage()}}><option value="5">5 km</option><option value="25">25 km</option><option value="100">100 km</option></select></label><button className="underline" onClick={()=>{setNear(null);resetPage()}}>Clear nearby filter</button><span className="text-xs">Cases without coordinates are excluded. Distances are approximate.</span></>}{nearError&&<p role="status">{nearError}</p>}</div>
      <div className="circle-tabs" role="group" aria-label="Case category">{categories.map(([key,label]) => <button key={key} aria-pressed={category===key} onClick={() => {setCategory(key); resetPage()}}>{label}</button>)}</div>
      <div className="circle-stats">{stats.map(s => <article key={s.label}><s.icon size={20} /><span>{s.label}</span><strong>{failed ? '—' : s.value}</strong><small>{s.note}</small></article>)}</div>
      <p className="circle-caption">{demo ? 'Sample statistics' : 'Platform reports only'} · Found / recovered includes owner-reported outcomes; verified and disputed outcomes are labeled on each case. Disputed outcomes do not count as found. Found listings are excluded from missing/recovery percentages. Closed cases remain in totals and are not counted as found. Figures follow the category, place, search, and reporting-period filters.</p>
      <div className="circle-list-head"><h3>{visible.length} {visible.length === 1 ? 'case' : 'cases'}</h3><label><span className="sr-only">Case status</span><select value={status} onChange={e => {setStatus(e.target.value); resetPage()}}><option value="all">All outcomes</option><option value="active">Still missing</option><option value="resolved">Reported found / recovered</option><option value="closed">Closed · unconfirmed</option></select></label></div>
      {mapView && <div className="mb-6"><UnifiedMap reports={visible}/><p className="text-xs mt-2">{visible.filter(r=>!validPoint(r.last_seen_lat,r.last_seen_lng)).length} cases have no coordinates and cannot appear on the map.</p></div>}
      <div className="circle-cases">{visible.slice(0,page*9).map(r => {
        const kind = categoryOf(r)
        const Icon = (kind === 'belongings' || kind === 'found') ? Package : kind === 'kidnapping' ? ShieldAlert : Users
        return <Link href={'/reports/'+r.id} className="circle-case" key={r.id}>
          <div className={'circle-case-symbol '+kind}><Icon size={29} strokeWidth={1.4} /><span>{(kind === 'belongings' || kind === 'found') ? r.item_details?.item_type || 'Belonging' : kind === 'kidnapping' ? 'Abduction reported' : 'Help bring them home'}</span></div>
          <div className="circle-case-body"><div className="circle-case-label">{caseLabel(r)}<ArrowUpRight size={17} /></div><h3>{r.subject}</h3><p><MapPin size={14} />{[detailsOf(r)?.locality, detailsOf(r)?.state].filter(Boolean).join(', ') || r.last_seen_location || 'Location not specified'}</p><span className={'circle-status '+r.status}><span />{statusLabel(r)}</span>{r.status === 'resolved' && detailsOf(r)?.outcome_location && <p>Found in: {detailsOf(r)?.outcome_location}</p>}<footer>Updated {new Date(r.updated_at || r.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Lagos'})}</footer></div>
        </Link>
      })}</div>
      {!visible.length && <div className="circle-empty"><Search size={28} /><h3>{failed ? 'Unable to load cases' : 'No cases in this selection'}</h3><p>{failed ? 'Refresh the page to try again.' : 'Try a different category, place, or reporting period.'}</p><button onClick={() => {setQuery('');setState('all');setPeriod('all');setStatus('all');setCategory('all');setNear(null);resetPage()}}>Clear filters</button></div>}
      {visible.length > page*9 && <button className="circle-load" onClick={() => setPage(page+1)}>Show more cases</button>}
      <section id="location-stats" className="circle-location"><div className="circle-section-head"><div><div className="circle-eyebrow">A CLEARER PICTURE</div><h2>{locationMode === 'last-seen' ? 'Cases by last-seen area' : 'Where people and belongings were found'}</h2></div><MapPin size={25} /></div><div className="flex flex-wrap gap-4 mb-4 text-sm"><button className="underline" aria-pressed={locationMode==='last-seen'} onClick={()=>setLocationMode('last-seen')}>Last-seen areas</button><button className="underline" aria-pressed={locationMode==='recovery'} onClick={()=>setLocationMode('recovery')}>Found / recovered areas</button></div>{locationMode === 'recovery' && <div className="circle-table-wrap"><table><thead><tr><th>Reported found area</th><th>People found</th><th>Belongings recovered</th></tr></thead><tbody>{recoveries.map(r=><tr key={r.area}><th>{r.area}</th><td>{r.people}</td><td>{r.belongings}</td></tr>)}</tbody></table>{!recoveries.length&&<p>No recovery locations in this selection.</p>}</div>}<div hidden={locationMode !== 'last-seen'}><p>Grouped by the reported last-seen state / area. These are case counts, not a ranking of danger. Kidnapping cases are a subset of people cases.</p><div className="circle-table-wrap"><table><thead><tr><th>State / area</th><th>People missing</th><th>People found</th><th>Kidnapping cases</th><th>Items missing</th><th>Items recovered</th></tr></thead><tbody>{locations.map(l => <tr key={l.area}><th>{l.area}</th><td>{l.totals.people.active}</td><td>{l.totals.people.found}</td><td>{l.totals.kidnapping.total}</td><td>{l.totals.belongings.active}</td><td>{l.totals.belongings.found}</td></tr>)}</tbody></table></div>{!locations.length && <p>{failed ? 'Location statistics unavailable.' : 'No location data for this selection.'}</p>}</div><p className="mt-4 text-xs">The reporting-period filter selects when cases were created, not the recovery date. Recovery locations are voluntarily supplied general areas.</p></section>
    </section><footer className="circle-footer"><IdanuBrand compact /><span>Every case deserves an update.</span><small>Working name · A community reporting platform</small></footer>
  </main>
}
