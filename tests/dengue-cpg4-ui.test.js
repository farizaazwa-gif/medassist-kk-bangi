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
