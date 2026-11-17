const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./load-ts.cjs');
const {summaryOf,categoryOf,areaOf,recoveryAreas,statusLabel}=load('lib/cases.ts');
const {distanceKm,validPoint}=load('lib/location.ts');
function person(status,extra={}){return{report_type:'missing_child',status,...extra}}
function item(status,extra={}){return{report_type:'missing_item',status,...extra}}
test('one kidnapping incident may contain separate people without double-counting',()=>{
 const data=summaryOf([person('active',{incident_id:'same',person_details:{case_kind:'reported_kidnapping'}}),person('resolved',{incident_id:'same',person_details:{case_kind:'reported_kidnapping'}}),person('closed')]);
 assert.equal(data.people.total,3);assert.equal(data.kidnapping.total,2);assert.equal(data.incidents,1);assert.equal(data.people.found,1);assert.equal(data.people.rate,33);
});
test('found listings, disputed outcomes and unpublished duplicates do not inflate recovery rates',()=>{
 const data=summaryOf([item('active'),item('resolved'),item('active',{item_details:{listing_kind:'found'}}),item('resolved',{outcome_verification:'disputed'}),item('resolved',{moderation_status:'duplicate'})]);
 assert.equal(data.belongings.total,3);assert.equal(data.belongings.found,1);assert.equal(data.belongings.active,2);assert.equal(data.foundListings,1);assert.equal(data.belongings.rate,33);
});
test('empty cases do not claim a zero percent recovery rate',()=>assert.equal(summaryOf([]).people.rate,null));
test('area grouping normalizes case and whitespace without guessing missing areas',()=>{assert.equal(areaOf(person('active',{person_details:{state:'  KADUNA  '}})),'Kaduna');assert.equal(areaOf(person('active')),'Area not specified')});
test('recovery grouping uses found location rather than last-seen location',()=>{
 const rows=recoveryAreas([person('resolved',{person_details:{state:'Lagos',outcome_state:'Kaduna'}}),item('resolved',{outcome_verification:'disputed',item_details:{outcome_state:'Kaduna'}})]);
 assert.equal(rows.length,1);assert.equal(rows[0].area,'kaduna');assert.equal(rows[0].people,1);assert.equal(rows[0].belongings,0);
});
test('zero coordinates are valid, impossible coordinates are rejected, and distance is geographic',()=>{assert.equal(validPoint(0,0),true);assert.equal(validPoint(91,0),false);assert.equal(validPoint(NaN,0),false);assert.equal(validPoint(null,0),false);assert.ok(Math.abs(distanceKm({lat:0,lng:0},{lat:0,lng:1})-111.195)<.01)});
test('found listings await an owner and disputed cases are clearly labeled',()=>{assert.equal(statusLabel(item('active',{item_details:{listing_kind:'found'}})),'Awaiting owner');assert.equal(statusLabel(person('resolved',{outcome_verification:'disputed'})),'Outcome disputed')});