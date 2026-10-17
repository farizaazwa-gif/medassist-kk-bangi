const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../assets/dengue-cpg4');

function form(overrides = {}) {
  const values = {clDxDay:'4',clCpgDxCertainty:'suspected',clCpgDxReviewed:true,dfGroup:'adult',clDxType:'Dengue fever',clPhase:'febrile phase',clHaemo:'haemodynamically stable',clPlanOption:'outpatient',clWeight:'60',clHeight:'170',clSex:'Male',dfBasis:'cpg',...overrides};
  const elements = Object.fromEntries(Object.entries(values).map(([id,value])=>[id,typeof value === 'boolean'?{checked:value,value:''}:{value:String(value)}]));
  const context={window:{MedAssistDengueCpg4:C},document:{readyState:'loading',addEventListener(){},getElementById:id=>elements[id],querySelectorAll:()=>[]}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/dengue-cpg4-ui.js'),'utf8'),context);
  return context.window.MedAssistDengueCpg4UI;
}

test('measured urine requires volume, positive interval and actual weight',()=>{
  assert.equal(form().validate('cl'),true);
  assert.equal(form({clCpgUrineMl:120}).validate('cl'),false);
  assert.equal(form({clCpgUrineMl:120,clCpgUrineHours:0}).validate('cl'),false);
  assert.equal(form({clCpgUrineMl:120,clCpgUrineHours:4}).validate('cl'),true);
  assert.match(form({clCpgUrineMl:120,clCpgUrineHours:4}).recordLines('cl').join(' '),/0.50 mL\/kg\/hour/);
});
test('fluid chart rejects negative volumes and non-positive agreed targets',()=>{
  for(const id of ['clCpgOralHourly','clCpgOralTotal','clCpgIvTotal','clCpgUrineMl'])assert.equal(form({[id]:-1}).validate('cl'),false);
  assert.equal(form({clCpgOralTotal:0,clCpgIvTotal:0}).validate('cl'),true);
  assert.equal(form({clCpgQuotaTarget:0}).validate('cl'),false);
  assert.equal(form({clCpgQuotaTarget:5400}).validate('cl'),true);
});
test('restriction needs an individual regimen and onset cannot follow assessment',()=>{
  assert.equal(form({clCpgFluidRestricted:true}).validate('cl'),false);
  assert.equal(form({clCpgFluidRestricted:true,clCpgFluidRegimen:'clinician prescribed regimen'}).validate('cl'),true);
  assert.equal(form({clCpgCriticalStart:'2026-10-16T10:00',clVitalDateTime:'2026-10-16T09:00'}).validate('cl'),false);
});

test('adult frequency documentation never reintroduces legacy warning labels',()=>{
  for(const n of [0,1,2,3,4,10]){
    const ui=form({clPhase:'critical phase',clVomitLast24:n,clStoolLast24:n});
    assert.equal(ui.frequencyLine('cl','vomiting'),`Vomiting: ${n} times/24 h.`);
    assert.equal(ui.frequencyLine('cl','stool'),`Loose stool: ${n} times/24 h.`);
    assert.equal(ui.warningData('cl').positive.length,n>3?1:0);
  }
});

test('new-case and follow-up FBC plans are concise and respect an entered review date',()=>{
  const lines=form().adjustPlan('cl','outpatient',['Repeat / continue serial FBC monitoring.','TCA STAT if warning signs develop.']);
  assert.equal(lines[0],'Repeat FBC CM.');
  assert.equal(lines[1],'TCA STAT if warning signs / worsening symptoms.');
  const f=form({dfuGroup:'adult',dfuPhase:'febrile phase',dfuPlanSubMonTca:true,dfuNextTca:'2026-10-18'});
  assert.equal(f.adjustPlan('dfu','monitoring',['Continue serial FBC monitoring.'])[0],'Repeat FBC on 18/10/2026.');
  assert.equal(f.adjustPlan('dfu','others',['Repeat FBC at 2 pm.'])[0],'Repeat FBC at 2 pm.');
});

test('clinician warning override needs a specific documented finding',()=>{
  assert.equal(form({clWarningStatus:'present',clPlanOption:'refer',clPlanSubReferFluid:false}).validate('cl'),false);
  const ui=form({clWarningStatus:'present',clCpgWarningDetail:'Postural hypotension on reassessment',clPlanOption:'refer',clPlanSubReferFluid:false});
  assert.equal(ui.validate('cl'),true);
  assert.match(ui.warningData('cl').positive.join(' '),/Postural hypotension/);
  assert.equal(form({clWarningStatus:'none',clCpgWarningDetail:'Old finding'}).warningData('cl').positive.length,0);
});

test('diagnosis follows Table 7 without management groups or invented qualifiers',()=>{
  assert.equal(form().diagnosis('cl'),'Suspected dengue without warning signs, D4, febrile phase, not in shock, NKMI.');
  const confirmed=form({clCpgDxCertainty:'confirmed',clCpgDxEvidence:'NS1 positive 17/10/2026'});
  assert.equal(confirmed.validate('cl'),true);
  assert.equal(confirmed.diagnosis('cl'),'Confirmed dengue without warning signs, D4, febrile phase, not in shock, NKMI.');
  assert.match(confirmed.recordLines('cl').join(' '),/Dengue confirmation: NS1 positive/);
  assert.equal(form({clComorbid:'DM',clDxComorbidStatus:'present'}).diagnosis('cl'),'Suspected dengue without warning signs, D4, febrile phase, not in shock, underlying DM.');
  const b2=form({clPhase:'critical phase',clVomitLast24:4});
  assert.equal(b2.diagnosis('cl'),'Suspected dengue with warning signs (persistent vomiting (4 episodes/24 h)), D4, critical phase, not in shock, NKMI.');
  assert.doesNotMatch(b2.diagnosis('cl'),/Group|classified|current assessment/);
});

test('diagnosis review and confirmation cannot be inferred from blank/default inputs',()=>{
  for(const patch of [{clCpgDxReviewed:false},{clCpgDxCertainty:''},{clCpgDxCertainty:'confirmed'},{clDxDay:''},{clDxDay:0},{clDxDay:1.5},{clDxDay:-1},{clDxComorbidStatus:'present',clDxComorbid:''}])assert.equal(form(patch).validate('cl'),false,JSON.stringify(patch));
  assert.doesNotMatch(form({clCpgDxReviewed:false}).diagnosis('cl'),/without warning signs|NKMI/);
  assert.doesNotMatch(form({clCpgDxCertainty:'confirmed',clCpgDxEvidence:''}).diagnosis('cl'),/Confirmed dengue/);
  assert.equal(form({clCpgDxCertainty:'confirmed',clCpgDxEvidence:'Prior positive PCR reviewed'}).validate('cl'),true);
  assert.equal(form({dfGroup:'paeds',clCpgDxReviewed:false,clDxDay:''}).validate('cl'),true);
});

test('severe dengue diagnosis names severity and shock without a second DNWS/DWWS label',()=>{
  for(const haemo of ['compensated shock','decompensated shock']){
    const dx=form({clPhase:'critical phase',clHaemo:haemo,clVomitLast24:5}).diagnosis('cl');
    assert.match(dx,new RegExp('Suspected severe dengue, D4, critical phase, '+haemo));
    assert.doesNotMatch(dx,/with(?:out)? warning signs/);
  }
  const nonShock=form({clCpgSevereBleeding:true});
  assert.match(nonShock.diagnosis('cl'),/severe dengue \(severe bleeding\).*not in shock/);
  assert.equal(form({clOrganFailure:'yes',clPlanOption:'refer'}).validate('cl'),false);
});

test('special populations and follow-up retain complete diagnosis components',()=>{
  assert.match(form({clSex:'Female',clPregnancy:'yes'}).diagnosis('cl'),/NKMI, pregnant/);
  assert.match(form({clAge:70}).diagnosis('cl'),/age 70 years/);
  assert.match(form({clWeight:100}).diagnosis('cl'),/obesity/);
  const followup=form({dfuGroup:'adult',dfuDayIllness:5,dfuPhase:'critical phase',dfuHaemo:'haemodynamically stable',dfuCpgDxCertainty:'confirmed',dfuCpgDxEvidence:'NS1 positive yesterday',dfuCpgDxReviewed:true});
  assert.equal(followup.diagnosis('dfu'),'Confirmed dengue without warning signs, D5, critical phase, not in shock, NKMI.');
});
