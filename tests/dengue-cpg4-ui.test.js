const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../assets/dengue-cpg4');

function form(overrides = {}) {
  const values = {dfGroup:'adult',clDxType:'Dengue fever',clPhase:'febrile phase',clHaemo:'haemodynamically stable',clPlanOption:'outpatient',clWeight:'60',clHeight:'170',clSex:'Male',dfBasis:'cpg',...overrides};
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
