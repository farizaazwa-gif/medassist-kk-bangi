const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../assets/dengue-cpg4.js");
const { INDEX_HTML: html } = require("./helpers/source-tools.js");
const base = {weight:60,height:170,sex:"Male",basis:"cpg",phase:"febrile phase",haemo:"haemodynamically stable",oral:"able",fluidState:"no-warning"};

test('CPG4 p10 and Table 6: all ten adult warning findings, with phase context',()=>{
  const findings=[{worseDefervescence:true},{intenseAbdominalPain:true},{vomit:4},{lethargy:true},{fluidAccumulation:true},{postural:true},{liverGt2:true},{lowUrine4h:true},{bleeding:true},{rapidHctPlt:true}];
  for(const finding of findings){
    const critical=C.assess({...base,phase:'critical phase',...finding});
    assert.equal(critical.group,'B2');assert.equal(critical.needsHospital,true);assert.equal(critical.warningSigns.length,1);
    const febrile=C.assess({...base,...finding});assert.equal(febrile.warningSigns.length,0);assert.ok(febrile.concerns.length>0);
    assert.equal(C.assess({...base,nearCritical:true,...finding}).group,'B2');
  }
  assert.match(C.assess({...base,nearCritical:true,worseDefervescence:true}).warningSigns[0],/no clinical improvement/);
  assert.match(C.assess({...base,nearCritical:true,lethargy:true}).warningSigns[0],/irritability \/ confusion/);
});

test("CPG4: numeric vitals alone never diagnose shock",()=>{
  for(const vital of [{sbp:120,dbp:80,pulse:105},{sbp:110,dbp:95,pulse:90},{sbp:85,dbp:70,pulse:120}]) {
    const a=C.assess({...base,...vital});
    assert.notEqual(a.group,"C");
    assert.equal(a.urgent.length,0);
  }
  const a=html.indexOf("function dengueVitalShockAssessment(mode){");
  const b=html.indexOf("function renderDengueVitalShockResult",a);
  assert.doesNotMatch(html.slice(a,b),/tachycardia|hypotensiveBp|narrowPulsePressure/);
});
test("CPG4: compensated and decompensated shock require clinician-selected status",()=>{
  assert.equal(C.assess({...base,haemo:"compensated shock"}).group,"C");
  assert.equal(C.assess({...base,haemo:"decompensated shock"}).group,"C");
  assert.equal(C.fluid({...base,fluidState:"compensated"}).valid,false);
});
test("CPG4 Table 3: exactly 3 vomits differs from >3 near critical phase",()=>{
  assert.equal(C.assess({...base,phase:"critical phase",vomit:3}).warningSigns.length,0);
  assert.equal(C.assess({...base,phase:"critical phase",vomit:4}).group,"B2");
  assert.equal(C.assess({...base,nearCritical:true,vomit:4}).group,"B2");
  assert.equal(C.assess({...base,vomit:4}).warningSigns.length,0);
  assert.equal(C.assess({...base,vomit:4,oral:"unable"}).needsHospital,true);
});
test("loose stool is assessed for dehydration, never a standalone adult warning sign",()=>{
  const a=C.assess({...base,phase:"critical phase",stool:8});
  assert.equal(a.warningSigns.length,0);
  assert.match(a.concerns[0],/dehydration/);
});
test("Group B1 stable comorbidity is distinct from B2 and unstable-comorbidity referral",()=>{
  const stable=C.assess({...base,comorbidity:true});
  assert.equal(stable.group,"B1");assert.equal(stable.needsHospital,false);
  assert.equal(C.assess({...base,unstableComorbidity:true}).needsHospital,true);
  assert.equal(C.assess({...base,age:65}).group,"A");
  assert.equal(C.assess({...base,age:66}).group,"B1");
  assert.equal(C.assess({...base,pregnant:true}).needsHospital,true);
});
test("severe organ involvement, severe bleeding and leakage with distress use Group C",()=>{
  for(const key of ["severeOrgan","severeBleeding","leakRespiratory"])
    assert.equal(C.assess({...base,[key]:true}).group,"C");
  assert.equal(C.assess({...base,seizure:true}).level,"red");
});
test('non-shock Group C never inherits a routine B2 or febrile infusion',()=>{
  for(const key of ['severeOrgan','severeBleeding','leakRespiratory']){
    for(const fluidState of ['no-warning','febrile','warning']){
      const r=C.fluid({...base,[key]:true,phase:fluidState==='warning'?'critical phase':'febrile phase',vomit:5,oral:'unable',oralHourly:0,fluidState,rate:3});
      assert.equal(r.valid,false);assert.match(r.display,/Severe dengue without recorded shock/);
    }
    const r=C.fluid({...base,[key]:true,haemo:'compensated shock',fluidState:'compensated'});
    assert.equal(r.valid,true);assert.match(r.headline,/600 mL/);
  }
  assert.equal(C.fluid({...base,phase:'critical phase',vomit:4,oral:'unable',fluidState:'warning',rate:3}).valid,true);
});
test("mild abdominal pain and small lab changes do not automatically become formal warning signs",()=>{
  const a=C.assess({...base,phase:"critical phase",abdominalPain:true,labTrend:true});
  assert.equal(a.warningSigns.length,0);
  assert.equal(C.assess({...base,phase:"critical phase",intenseAbdominalPain:true}).group,"B2");
  assert.equal(C.assess({...base,phase:"critical phase",rapidHctPlt:true}).group,"B2");
});
test("CPG p48: exact IBW/ABW formula, BMI >27.5 boundary and unrounded computation",()=>{
  const male=C.weights({weight:90,height:170,sex:"Male"});
  assert.equal(male.ibw,66.38);assert.equal(male.abw,75.828);assert.equal(male.selected,75.828);
  assert.ok(Math.abs(C.weights({weight:90,height:170,sex:"Female"}).ibw-61.88)<1e-10);
  assert.equal(C.weights({weight:110,height:200,sex:"Male"}).basis,"actual");
  assert.equal(C.weights({weight:110.01,height:200,sex:"Male"}).basis,"adj");
});
test("invalid or missing weights are not converted into a dose",()=>{
  for(const weight of [0,-1,"",NaN,Infinity]) assert.equal(C.weights({...base,weight}).valid,false);
  assert.equal(C.weights({...base,height:""}).valid,false);
  assert.equal(C.weights({...base,weight:100,sex:""}).valid,false);
});
test("Holliday–Segar is 4/2/1 and maintenance calculation weight is capped at 70 kg",()=>{
  for(const [weight,expected] of [[10,40],[20,60],[30,70],[50,90],[60,100],[70,110],[90,110]]) assert.equal(C.maintenance(weight),expected);
});
test("Appendix 11: 60 kg quota is ONE day maintenance plus 5% over 48h",()=>{
  assert.deepEqual(C.quota(60),{weight:60,hourly:100,formula:5400,table:5400,differs:false});
});
test("CPG table/formula discrepancies remain visible instead of invented rounding",()=>{
  assert.equal(C.quota(65).formula,5770);assert.equal(C.quota(65).table,5700);assert.equal(C.quota(65).differs,true);
  assert.equal(C.quota(90).formula,6140);assert.equal(C.quota(90).table,6000);
  assert.equal(C.quota(62).table,null);
});
test("Algorithm 2: 60 kg compensated shock is 600 mL over one hour",()=>{
  const plan=C.fluid({...base,haemo:"compensated shock",fluidState:"compensated"});
  assert.equal(plan.valid,true);assert.match(plan.plan,/600 mL over 1 hour/);
});
test("Algorithm 3: 60 kg decompensated shock is 1200 mL over 15–30 minutes",()=>{
  assert.match(C.fluid({...base,haemo:"decompensated shock",fluidState:"decompensated"}).plan,/1200 mL over 15–30 minutes/);
});
test("70 kg maintenance cap is NOT imposed on shock resuscitation",()=>{
  const plan=C.fluid({...base,weight:90,haemo:"compensated shock",fluidState:"compensated"});
  assert.match(plan.plan,/758\.3 mL/); // 75.828 kg ABW × 10, rounded for display only.
});
test("oral+IV maintenance subtracts recorded oral intake and never returns negative IV",()=>{
  const s={...base,fluidState:"febrile",dehydrated:true,oralHourly:40};
  assert.match(C.fluid(s).plan,/IV component 60 mL\/hour/);
  assert.match(C.fluid({...s,oralHourly:120}).plan,/IV component 0 mL\/hour/);
  assert.equal(C.fluid({...s,oralHourly:""}).valid,false);
});
test("B2: phase, warning signs, intake and permitted rate are checked before calculating",()=>{
  const s={...base,phase:"critical phase",fluidState:"warning",vomit:4,oral:"unable",rate:3};
  assert.match(C.fluid(s).plan,/180 mL\/hour/);
  assert.match(C.fluid({...s,rate:5}).plan,/300 mL\/hour/);
  assert.equal(C.fluid({...s,rate:1.2}).valid,false);
  assert.equal(C.fluid({...s,phase:"febrile phase"}).valid,false);
  assert.equal(C.fluid({...s,vomit:0}).valid,false);
  assert.equal(C.fluid({...s,oral:"able"}).valid,false);
});
test("recovery phase does not inherit a critical-phase IV regimen",()=>{
  assert.equal(C.fluid({...base,phase:"recovery phase",fluidState:"warning",vomit:4,oral:"unable",rate:3}).valid,false);
});
test("manual weight override requires a documented rationale",()=>{
  const s={...base,basis:"actual",haemo:"compensated shock",fluidState:"compensated"};
  assert.equal(C.fluid(s).valid,false);
  assert.equal(C.fluid({...s,weightReason:"Clinician-confirmed weight basis"}).valid,true);
});
test("post-vaccination timing is date-only, inclusive of day 30 and validates dates",()=>{
  assert.equal(C.vaccineDays("2026-09-16","2026-10-16"),30);
  assert.equal(C.vaccineDays("2026-09-15","2026-10-16"),31);
  assert.equal(C.vaccineDays("2026-10-17","2026-10-16"),-1);
  assert.equal(C.vaccineDays("2026-02-30","2026-10-16"),null);
});
test("medication advice preserves contraindication and chronic-steroid distinctions",()=>{
  assert.match(C.medicationAdvice({sglt2:true})[0],/temporarily withhold/);
  assert.match(C.medicationAdvice({metformin:true})[0],/renal impairment, dehydration and haemodynamic instability/);
  assert.match(C.medicationAdvice({steroid:true})[0],/do not automatically stop chronic/);
});
test("stopping FBC requires every recovery check and an explicit clinician decision",()=>{
  const complete={afebrileConfirmed:true,improving:true,stable:true,intakeUrine:true,noBleedingResp:true,labsReviewed:true,stopFbcConfirmed:true};
  assert.equal(C.dischargeReady(complete),true);
  for(const key of Object.keys(complete)) assert.equal(C.dischargeReady({...complete,[key]:false}),false);
});
test("both adult workflows are wired to the shared CPG4 module and paediatric branch remains",()=>{
  for(const p of ["cl","dfu"]) {
    assert.match(html,new RegExp(`MedAssistDengueCpg4UI\\.fluid\\("${p}"\\)`));
    assert.match(html,new RegExp(`MedAssistDengueCpg4UI\\.validate\\("${p}"\\)`));
    assert.match(html,new RegExp(`MedAssistDengueCpg4UI\\.adjustPlan\\("${p}"`));
  }
  assert.match(html,/if\(value\(followUp\?"dfuGroup":"dfGroup"\)==="paeds"\) return denguePaediatricReferralAssessment\(mode\)/);
});
test('compact shock result retains emergency action and full source detail', () => {
  const base={weight:60,height:170,sex:'Male',basis:'cpg',phase:'critical phase',oral:'able'};
  for (const [haemo,fluidState,amount,duration] of [['compensated shock','compensated',600,'1 hour'],['decompensated shock','decompensated',1200,'15–30 minutes']]) {
    const r=C.fluid({...base,haemo,fluidState});
    assert.equal(r.headline,`Isotonic crystalloid ${amount} mL over ${duration}`);
    assert.match(r.action,/Emergency hospital transfer/);
    assert.match(r.plan,/CPG Algorithm/);
    assert.equal(r.plan,r.display);
  }
});

test('paediatric calculation uses current weight even before the derived field updates',()=>{
  const vm=require('node:vm');
  for(const [name,group,weight,derived,state,rate] of [['getDengueFluidInstruction','dfGroup','clWeight','dfSelectedWeight','dfState','dfRate'],['getDengueFollowUpFluidInstruction','dfuGroup','dfuWeight','dfuFluidSelectedWeight','dfuFluidState','dfuFluidRate']]){
    const start=html.indexOf(`function ${name}(){`),end=html.indexOf('\nfunction ',start+1);
    const fields={[group]:'paeds',[weight]:'20',[derived]:'50',[state]:'compensated',[rate]:'10'};
    const context={value:id=>fields[id]||'',fv:id=>fields[id]||''};
    vm.runInNewContext(html.slice(start,end)+`;this.calculate=${name};`,context);
    assert.match(context.calculate().display,/200 mL/);
    fields[weight]='25';assert.match(context.calculate().display,/250 mL/);
    for(const invalid of ['','0','-20','Infinity']){fields[weight]=invalid;assert.equal(context.calculate().valid,false);}
  }
});

test('compact febrile and B2 results keep the IV dose prominent and full plan intact',()=>{
  const febrile=C.fluid({...base,oral:'reduced',oralHourly:30,fluidState:'febrile'});
  assert.equal(febrile.headline,'IV isotonic crystalloid 70 mL/hour');
  assert.match(febrile.action,/Oral \+ IV target: 100 mL\/hour/);
  assert.match(febrile.plan,/IV component 70 mL\/hour/);
  const b2=C.fluid({...base,phase:'critical phase',oral:'reduced',vomit:4,fluidState:'warning',rate:3});
  assert.equal(b2.headline,'Isotonic crystalloid 180 mL/hour');
  assert.match(b2.action,/Reassess after 1 hour.*requires admission/);
});


test('B2 oral tolerance is not silently treated as adequate intake: reported 65 kg case',()=>{
  const s={...base,weight:65,phase:'critical phase',fluidState:'warning',warningConfirmed:true,oral:'able',rate:4};
  for(const oralAdequacy of [undefined,'','unknown',null]) {
    const r=C.fluid({...s,oralAdequacy});
    assert.equal(r.valid,false);
    assert.equal(r.headline,'Confirm oral intake adequacy');
    assert.doesNotMatch(r.display,/hydration is adequate|260 mL/);
  }
  const adequate=C.fluid({...s,oralAdequacy:'adequate'});
  assert.equal(adequate.valid,false);
  assert.match(adequate.action,/Group B2 still requires hospital admission/);
  assert.doesNotMatch(adequate.plan,/260 mL/);
  const inadequate=C.fluid({...s,oralAdequacy:'inadequate'});
  assert.equal(inadequate.valid,true);
  assert.equal(inadequate.headline,'Isotonic crystalloid 260 mL/hour');
});

test('oral adequacy assessment preserves phase, warning-sign, shock and weight checks',()=>{
  const s={...base,weight:65,phase:'critical phase',fluidState:'warning',warningConfirmed:true,oralAdequacy:'inadequate',rate:4};
  for(const change of [{phase:'febrile phase'},{warningConfirmed:false},{weight:''},{haemo:'compensated shock'}]) assert.equal(C.fluid({...s,...change}).valid,false);
  for(const oral of ['reduced','unable']) assert.equal(C.fluid({...s,oral,oralAdequacy:''}).valid,true);
  assert.equal(C.fluid({...s,dehydrated:true,oralAdequacy:''}).valid,true);
});

test('febrile maintenance distinguishes oral adequacy from tolerance and still deducts measured intake',()=>{
  const s={...base,fluidState:'febrile',oralHourly:30};
  assert.equal(C.fluid(s).headline,'Confirm oral intake adequacy');
  assert.equal(C.fluid({...s,oralAdequacy:'adequate'}).valid,false);
  assert.equal(C.fluid({...s,oralAdequacy:'inadequate'}).headline,'IV isotonic crystalloid 70 mL/hour');
  assert.equal(C.fluid({...s,oralAdequacy:'inadequate',oralHourly:''}).valid,false);
});

test('fluid pathways exclude the reported febrile/critical mismatch without changing clinical assessment',()=>{
  const s={...base,weight:72,height:175,phase:'critical phase',warningConfirmed:true,fluidState:'febrile'};
  assert.deepEqual(C.fluidCategories(s),{allowed:['warning'],preferred:'warning'});
  assert.equal(s.phase,'critical phase');
  assert.equal(C.fluid({...s,oralAdequacy:'inadequate',oralHourly:1000}).valid,false);
});

test('every selectable adult pathway is consistent with phase, warning signs and declared shock',()=>{
  for(const phase of ['febrile phase','critical phase','recovery phase'])
  for(const haemo of ['haemodynamically stable','compensated shock','decompensated shock'])
  for(const warningConfirmed of [false,true])
  for(const nearCritical of [false,true]) {
    const s={...base,phase,haemo,warningConfirmed,nearCritical,oral:'unable',oralHourly:0,rate:3};
    const choices=C.fluidCategories(s);assert.ok(choices.allowed.includes(choices.preferred));
    for(const fluidState of choices.allowed) assert.doesNotMatch(C.fluid({...s,fluidState}).display,/requires a clinician-confirmed febrile|requires assessment near\/in|Confirm dengue warning|Reconcile haemodynamic/);
    if(phase==='recovery phase' && haemo==='haemodynamically stable') assert.deepEqual(choices.allowed,['no-warning']);
  }
});

test('oral units are explicit and converted without rounding before calculation',()=>{
  assert.equal(C.oralRate(1000,'24'),1000/24);
  assert.equal(C.oralRate(1000,'1'),1000);
  assert.equal(C.oralRate(0,'24'),0);
  for(const volume of ['',-1,Infinity,NaN]) assert.equal(C.oralRate(volume,'24'),null);
  for(const period of ['',0,2,Infinity,'day']) assert.equal(C.oralRate(1000,period),null);
});

test('72 kg febrile case: daily intake gives 68.3 mL/hour; 1000 mL/hour gives zero, not an IV order',()=>{
  const s={...base,weight:72,height:175,fluidState:'febrile',oralAdequacy:'inadequate',oralHourly:1000};
  const daily=C.fluid({...s,oralPeriod:'24'});
  assert.equal(daily.headline,'IV isotonic crystalloid 68.3 mL/hour');
  assert.match(daily.plan,/calculation weight 70 kg/);assert.match(daily.plan,/1000 mL\/24 hours/);
  const hourly=C.fluid({...s,oralPeriod:'1'});
  assert.equal(hourly.headline,'IV maintenance component: 0 mL/hour');
  assert.equal(hourly.canPrescribe,false);assert.match(hourly.action,/no additional routine IV maintenance/);
});

test('recovery and referral findings never receive routine outpatient reassurance from no-warning category',()=>{
  assert.match(C.fluid({...base,phase:'recovery phase',nearCritical:true,warningConfirmed:true}).display,/Recovery phase/);
  const hospital=C.fluid({...base,phase:'critical phase',warningConfirmed:true});
  assert.match(hospital.display,/require hospital assessment/);
  assert.doesNotMatch(hospital.display,/confirm outpatient suitability/);
});

test('documented inadequate intake is reflected in assessment even when oral tolerance is preserved',()=>{
  const a=C.assess({...base,oralAdequacy:'inadequate'});
  assert.equal(a.group,'review');assert.equal(a.needsHospital,false);
  assert.ok(a.concerns.some(x=>/intake assessed as inadequate/.test(x)));
});
