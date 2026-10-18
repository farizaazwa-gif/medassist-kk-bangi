const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../assets/dengue-cpg4');

function fixture(overrides = {}) {
  const values = {clDxDay:'4',clCpgDxCertainty:'suspected',clCpgDxReviewed:true,dfGroup:'adult',clDxType:'Dengue fever',clPhase:'febrile phase',clHaemo:'haemodynamically stable',clPlanOption:'outpatient',clWeight:'60',clHeight:'170',clSex:'Male',dfBasis:'cpg',...overrides};
  const elements = Object.fromEntries(Object.entries(values).map(([id,value])=>[id,typeof value === 'boolean'?{checked:value,value:''}:{value:String(value)}]));
  for(const id of ['dfState','dfuFluidState'])if(elements[id])elements[id].options=['no-warning','febrile','warning','compensated','decompensated'].map(value=>({value,disabled:false,hidden:false}));
  const context={window:{MedAssistDengueCpg4:C},document:{readyState:'loading',addEventListener(){},getElementById:id=>elements[id],querySelectorAll:()=>[]}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/dengue-cpg4-ui.js'),'utf8'),context);
  return {ui:context.window.MedAssistDengueCpg4UI,elements};
}
function form(overrides = {}) { return fixture(overrides).ui; }
function adultValues(p, extra = {}) {
  return {[p === 'cl'?'dfGroup':'dfuGroup']:'adult',
    [`${p}Phase`]:'critical phase',[`${p}Haemo`]:'haemodynamically stable',
    [`${p}Weight`]:60,[`${p}Height`]:170,[`${p}Sex`]:'Male',[`${p}PA`]:'SNT',
    [p === 'cl'?'dfBasis':'dfuFluidBasis']:'cpg',
    [p === 'cl'?'clDxDay':'dfuDayIllness']:4,[`${p}CpgDxCertainty`]:'suspected',[`${p}CpgDxReviewed`]:true,
    [p === 'cl'?'clUrine':'dfuUrine']:p === 'cl'?'no':'normal',
    [p === 'cl'?'clDrink':'dfuOralIntake']:p === 'cl'?'able':'good',...extra};
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

test('both adult forms include examination ascites in warning assessment and diagnosis',()=>{
  for(const p of ['cl','dfu']){
    const {ui,elements}=fixture(adultValues(p,{[`${p}PAAscites`]:true,[`${p}CpgAccumulation`]:false}));
    assert.equal(ui.state(p).fluidAccumulation,true);
    assert.equal(ui.referral(p).group,'B2');
    assert.equal(ui.referral(p).needsHospital,true);
    assert.match(ui.diagnosis(p),/dengue with warning signs \(clinical fluid accumulation\)/);
    elements[`${p}PAAscites`].checked=false;
    assert.equal(ui.referral(p).group,'A');
    elements[`${p}CpgAccumulation`].checked=true;
    assert.equal(ui.referral(p).group,'B2');
  }
});

test('ascites retains illness-phase interpretation and never infers shock',()=>{
  for(const p of ['cl','dfu'])for(const phase of ['febrile phase','recovery phase']){
    const ui=form(adultValues(p,{[`${p}Phase`]:phase,[`${p}PAAscites`]:true}));
    assert.equal(ui.referral(p).group,'review');
    assert.equal(ui.warningData(p).positive.length,0);
    assert.match(ui.warningData(p).belowThreshold.join(' '),/clinical fluid accumulation/);
    assert.equal(ui.state(p).haemo,'haemodynamically stable');
  }
  assert.equal(form(adultValues('cl',{clPhase:'febrile phase',clCpgNearCritical:true,clPAAscites:true})).referral('cl').group,'B2');
});

test('deselected abdominal examination does not retain a hidden ascites warning',()=>{
  for(const p of ['cl','dfu']){
    const {ui,elements}=fixture(adultValues(p,{[`${p}PAAscites`]:true,[`${p}CpgAccumulation`]:false}));
    assert.equal(ui.referral(p).group,'B2');
    elements[`${p}PA`].value='';
    assert.equal(ui.referral(p).group,'A');
    elements[`${p}CpgAccumulation`].checked=true;
    assert.equal(ui.referral(p).group,'B2');
  }
});

test('measured absent urine reaches the duration finding at 4 hours in both adult forms',()=>{
  for(const p of ['cl','dfu'])for(const hours of [0.5,3.99,4,6,24]){
    const ui=form(adultValues(p,{[`${p}CpgUrineMl`]:0,[`${p}CpgUrineHours`]:hours}));
    assert.equal(ui.state(p).lowUrine4h,hours>=4);
    assert.equal(ui.referral(p).group,hours>=4?'B2':'review');
    assert.equal(ui.referral(p).needsHospital,hours>=4);
    assert.equal(ui.urineStatus(p),'no urine output');
    assert.equal(ui.state(p).haemo,'haemodynamically stable');
    assert.match(ui.recordLines(p).join(' '),new RegExp(`Measured urine: 0 mL over ${hours} h`));
    assert.match(ui.urineSummary(p),/qualitative PU is marked normal: reconcile/);
  }
});

test('zero measured urine stays phase-sensitive and does not depend on a weight to establish absence',()=>{
  for(const p of ['cl','dfu'])for(const phase of ['febrile phase','critical phase','recovery phase']){
    const ui=form(adultValues(p,{[`${p}Phase`]:phase,[`${p}CpgUrineMl`]:0,[`${p}CpgUrineHours`]:6,[`${p}Weight`]:''}));
    assert.equal(ui.state(p).lowUrine4h,true);
    assert.equal(ui.referral(p).group,phase === 'critical phase'?'B2':'review');
    assert.match(ui.recordLines(p).join(' '),/actual weight required for mL\/kg\/hour/);
    assert.equal(ui.state(p).haemo,'haemodynamically stable');
  }
});

test('positive measured output below 0.5 prompts review without inventing a persistent warning or shock',()=>{
  for(const p of ['cl','dfu'])for(const volume of [1,60,119.99,120,120.01]){
    const ui=form(adultValues(p,{[`${p}CpgUrineMl`]:volume,[`${p}CpgUrineHours`]:4}));
    assert.equal(ui.referral(p).group,volume<120?'review':'A');
    assert.equal(ui.state(p).lowUrine4h,false);
    assert.equal(ui.warningData(p).positive.length,0);
    assert.equal(ui.state(p).haemo,'haemodynamically stable');
    assert.equal(ui.urineStatus(p),volume<120?'reduced':'normal');
    if(volume<120)assert.match(ui.urineSummary(p),/confirm the reduced \/ absent urine for 4–6 hours finding if present/);
    if(volume===119.99)assert.match(ui.urineSummary(p),/<0.50 mL\/kg\/hour/);
    if(volume===120)assert.match(ui.urineSummary(p),/0.50 mL\/kg\/hour/);
  }
});

test('derived urine findings clear with corrected measurements and never overwrite the qualitative dropdown',()=>{
  for(const p of ['cl','dfu']){
    const urineId=p === 'cl'?'clUrine':'dfuUrine';
    const {ui,elements}=fixture(adultValues(p,{[`${p}CpgUrineMl`]:0,[`${p}CpgUrineHours`]:6}));
    assert.equal(ui.referral(p).group,'B2');
    assert.equal(elements[urineId].value,p === 'cl'?'no':'normal');
    elements[`${p}CpgUrineMl`].value='180';
    assert.equal(ui.referral(p).group,'A');
    assert.equal(ui.urineStatus(p),'normal');
    elements[`${p}CpgUrineMl`].value='';elements[`${p}CpgUrineHours`].value='';
    assert.equal(ui.state(p).lowUrine4h,false);
    assert.equal(ui.referral(p).group,'A');
  }
  for(const values of [{clCpgUrineMl:'',clCpgUrineHours:6},{clCpgUrineMl:0,clCpgUrineHours:''},{clCpgUrineMl:0,clCpgUrineHours:0},{clCpgUrineMl:-1,clCpgUrineHours:6}]){
    assert.equal(form(adultValues('cl',values)).state('cl').lowUrine4h,false);
  }
  assert.equal(form(adultValues('dfu',{dfuUrine:'no urine output',dfuCpgUrineMl:60,dfuCpgUrineHours:4})).urineStatus('dfu'),'no urine output');
});

test('below-guide urination frequency including zero prompts review but no automatic warning sign',()=>{
  for(const p of ['cl','dfu'])for(const frequency of [0,1,3,4,6]){
    const ui=form(adultValues(p,{[`${p}CpgVoids`]:frequency}));
    assert.equal(ui.referral(p).group,frequency<4?'review':'A');
    assert.equal(ui.warningData(p).positive.length,0);
    assert.equal(ui.state(p).lowUrine4h,false);
    assert.equal(ui.urineStatus(p),frequency<4?'review required (urination frequency below guide)':'normal');
    if(frequency<4)assert.match(ui.urineSummary(p),/frequency alone does not establish a warning sign/);
  }
});

test('fluid restriction reaches the engine and prevents routine febrile or B2 prescriptions in both forms',()=>{
  for(const p of ['cl','dfu'])for(const category of ['febrile','warning']){
    const ui=form(adultValues(p,{
      [`${p}Phase`]:category === 'febrile'?'febrile phase':'critical phase',
      [p === 'cl'?'dfState':'dfuFluidState']:category,[p === 'cl'?'dfRate':'dfuFluidRate']:3,
      [p === 'cl'?'clDrink':'dfuOralIntake']:p === 'cl'?'unable':'poor',
      [`${p}CpgOralHourly`]:0,[`${p}CpgAccumulation`]:category === 'warning',
      [`${p}CpgFluidRestricted`]:true,[`${p}CpgFluidRegimen`]:'  1000 mL/day total as prescribed  '
    }));
    assert.equal(ui.state(p).fluidRestricted,true);
    assert.equal(ui.state(p).fluidRegimen,'1000 mL/day total as prescribed');
    const result=ui.fluid(p);
    assert.equal(result.valid,false);assert.equal(result.canPrescribe,false);
    assert.match(result.headline,/Individualised fluid prescription required/);
    assert.doesNotMatch(result.plan,/IV NS \d/);
    assert.match(ui.recordLines(p).join(' '),/Fluid restriction: 1000 mL\/day total as prescribed/);
    assert.match(ui.oralAdvice(p),/^Individualised fluid regimen: 1000 mL\/day total as prescribed/);
    assert.doesNotMatch(ui.oralAdvice(p),/200 mL\/hour/);
  }
});

test('restriction context survives the concise copied shock prescription without changing clinician shock status',()=>{
  for(const p of ['cl','dfu'])for(const [haemo,category,amount] of [['compensated shock','compensated',600],['decompensated shock','decompensated',1200]]){
    const ui=form(adultValues(p,{
      [`${p}Haemo`]:haemo,[p === 'cl'?'dfState':'dfuFluidState']:category,
      [`${p}CpgFluidRestricted`]:true,[`${p}CpgFluidRegimen`]:'1000 mL/day total as prescribed'
    }));
    const result=ui.fluid(p);
    assert.equal(result.valid,true);assert.notEqual(result.canPrescribe,false);
    assert.match(result.plan,new RegExp(`IV NS ${amount} mL`));
    assert.ok(result.prescriptionNote);
    assert.ok(result.plan.includes(result.prescriptionNote));
    assert.match(result.plan,/1000 mL\/day total as prescribed/);
    assert.equal(ui.state(p).haemo,haemo);
  }
});

test('restricted quota display retains entered totals without presenting a routine maintenance target',()=>{
  for(const p of ['cl','dfu']){
    const {ui,elements}=fixture(adultValues(p,{
      [p === 'cl'?'dengueNewCaseTemplate':'dengueFollowUpTemplate']:'',
      [`${p}CpgQuotaDisplay`]:'',
      [`${p}CpgFluidRestricted`]:true,[`${p}CpgFluidRegimen`]:'1000 mL/day total as prescribed',
      [`${p}CpgOralTotal`]:200,[`${p}CpgIvTotal`]:100,[`${p}CpgQuotaTarget`]:1000
    }));
    for(const element of Object.values(elements))Object.assign(element,{dataset:{},textContent:'',classList:{toggle(){}},querySelector(){return null;},querySelectorAll(){return [];},closest(){return null;}});
    ui.refresh(p);
    const text=elements[`${p}CpgQuotaDisplay`].textContent;
    assert.match(text,/Individualised fluid prescription required/);
    assert.match(text,/Recorded oral \+ IV: 300 mL/);
    assert.match(text,/Clinician-agreed target: 1000 mL/);
    assert.doesNotMatch(text,/Maintenance \(oral \+ IV\):|formula estimate|5400 mL|mL\/hour/);
  }
});
