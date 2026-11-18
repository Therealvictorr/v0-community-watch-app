import type {Report} from './types'
import {normalizeArea} from './location'
export type CaseCategory='people'|'kidnapping'|'belongings'|'found'
export function categoryOf(r:Report):CaseCategory|null {if(r.report_type==='missing_item')return r.item_details?.listing_kind==='found'?'found':'belongings';if(r.report_type!=='missing_child')return null;return r.person_details?.case_kind==='reported_kidnapping'?'kidnapping':'people'}
export function detailsOf(r:Report){return r.report_type==='missing_item'?r.item_details:r.person_details}
export function areaOf(r:Report){const area=normalizeArea(detailsOf(r)?.state);return area==='area not specified'?'Area not specified':area.replace(/\b\p{L}/gu,c=>c.toUpperCase())}
export function summaryOf(reports:Report[]){
 const eligible=reports.filter(r=>!r.moderation_status||r.moderation_status==='approved')
 const summarize=(rows:Report[])=>{const found=rows.filter(r=>r.status==='resolved'&&r.outcome_verification!=='disputed').length,active=rows.filter(r=>r.status==='active'||(r.status==='resolved'&&r.outcome_verification==='disputed')).length;return{total:rows.length,found,active,closed:rows.filter(r=>r.status==='closed').length,verified:rows.filter(r=>r.status==='resolved'&&r.outcome_verification==='verified').length,rate:rows.length?Math.round(found/rows.length*100):null}}
 const people=eligible.filter(r=>r.report_type==='missing_child'),items=eligible.filter(r=>categoryOf(r)==='belongings'),kidnapping=people.filter(r=>categoryOf(r)==='kidnapping')
 return{people:summarize(people),belongings:summarize(items),kidnapping:summarize(kidnapping),incidents:new Set(kidnapping.map(r=>r.incident_id||r.id)).size,foundListings:eligible.filter(r=>categoryOf(r)==='found').length}
}
export function caseLabel(r:Report){const c=categoryOf(r);if(c==='kidnapping')return'Reported kidnapping';if(c==='people')return'Missing person';if(c==='found')return'Found belonging';if(c==='belongings')return r.item_details?.loss_type==='stolen'?'Stolen belonging':'Lost belonging';return'Incident'}
export function statusLabel(r:Report){if(r.status==='closed')return'Closed · outcome unconfirmed';if(r.outcome_verification==='disputed')return'Outcome disputed';if(r.status==='resolved')return r.outcome_verification==='verified'?(r.report_type==='missing_item'?'Recovery verified':'Found outcome verified'):(r.report_type==='missing_item'?'Reported recovered':'Reported found');return categoryOf(r)==='found'?'Awaiting owner':'Still missing'}
export function recoveryAreas(reports:Report[]){
 const groups=new Map<string,{area:string;people:number;belongings:number}>()
 for(const r of reports){if(r.status!=='resolved'||r.outcome_verification==='disputed'||categoryOf(r)==='found'||categoryOf(r)===null||(r.moderation_status&&r.moderation_status!=='approved'))continue;const area=normalizeArea(detailsOf(r)?.outcome_state||detailsOf(r)?.outcome_location),row=groups.get(area)||{area:area==='area not specified'?'Area not specified':area,people:0,belongings:0};if(r.report_type==='missing_child')row.people++;if(r.report_type==='missing_item')row.belongings++;groups.set(area,row)}return[...groups.values()]
}