// Optional full-document QA: provide jsdom 26 through MEDASSIST_JSDOM_MODULE.
// Browser QA must also cover accessibility-hardening.js, omitted here for jsdom performance.
const {JSDOM,ResourceLoader,VirtualConsole}=require(process.env.MEDASSIST_JSDOM_MODULE || 'jsdom');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
class Assets extends ResourceLoader{fetch(url){const u=new URL(url);if(u.pathname.endsWith('/accessibility-hardening.js'))return Promise.resolve(Buffer.from(''));const f=path.join(root,u.pathname);return u.hostname==='medassist.test'&&fs.existsSync(f)?Promise.resolve(fs.readFileSync(f)):null;}}
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Not implemented/.test(e.message))errors.push(e.message)});
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,''),{url:'https://medassist.test/',runScripts:'dangerously',resources:new Assets(),pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.alert=()=>{};w.confirm=()=>true;}});
 const w=dom.window,d=w.document;await new Promise(r=>w.addEventListener('load',r,{once:true}));console.log('Loaded',errors);
 const set=(id,v)=>{const e=d.getElementById(id);assert.ok(e,id);if(e.type==='checkbox')e.checked=v;else e.value=String(v);e.dispatchEvent(new w.Event(e.tagName==='SELECT'||e.type==='checkbox'?'change':'input',{bubbles:true}));};

 for(const p of ['cl','dfu']){
  const group=p==='cl'?'dfGroup':'dfuGroup',category=p==='cl'?'dfState':'dfuFluidState',rate=p==='cl'?'dfRate':'dfuFluidRate',calc=p==='cl'?'dfCalculate':'dfuFluidCalculate',result=d.getElementById(p==='cl'?'dfResult':'dfuFluidResult');
  const warning=p==='cl'?'clWarningStatus':'dfuCpgWarningConfirmed';
  set(p+'Weight',72);set(p+'Height',175);set(p+'Sex','Male');set(p+'Phase','critical phase');set(warning,p==='cl'?'present':true);
  assert.equal(d.getElementById(category).value,'warning');assert.equal(d.getElementById(category).querySelector('option[value="febrile"]').disabled,true);
  set(rate,4);set(p+'CpgOralHourly',1000);set(p+'CpgOralAdequacy','inadequate');d.getElementById(calc).click();
  assert.match(result.querySelector('strong').textContent,/280 mL\/hour/);assert.match(d.getElementById(p+'FluidWeightSummary').textContent,/70 kg.*selected 72 kg/);
  d.getElementById(category).value='febrile';d.getElementById(calc).click(); // stale restored selector, no input event
  assert.equal(d.getElementById(category).value,'warning');assert.equal(d.getElementById(p+'Phase').value,'critical phase');assert.match(result.textContent,/Confirm oral intake/);
  set(p+'CpgOralAdequacy','inadequate');assert.match(result.textContent,/280 mL\/hour/);
  d.getElementById(p+'FluidReviewAssessment').click();assert.equal(d.activeElement.id,p+'Phase');
  set(p+'Phase','febrile phase');set(warning,p==='cl'?'none':false);set(category,'febrile');set(p+'CpgOralPeriod','24');set(p+'CpgOralAdequacy','inadequate');
  for(let i=0;i<3;i++){d.getElementById(calc).click();assert.equal(result.querySelectorAll('.fluid-headline').length,1);assert.match(result.querySelector('strong').textContent,/68\.3 mL\/hour/);}
  assert.match(d.getElementById(p+'CpgOralUnitHint').textContent,/41\.7 mL\/hour/);
  set(p+'PlanOption','refer');d.getElementById(p+'Generate').click();assert.match(d.getElementById(p+'Output').value,/68\.3 mL\/hour/);assert.match(d.getElementById(p+'Output').value,/1000 mL\/24 hours/);assert.equal(d.getElementById(p+'Output').readOnly,false);
  set(p+'CpgOralPeriod','1');assert.equal(d.getElementById(p+'CpgOralAdequacy').value,'');set(p+'CpgOralAdequacy','inadequate');d.getElementById(calc).click();assert.match(result.querySelector('strong').textContent,/component: 0 mL\/hour/);
  assert.equal(w.MedAssistDengueCpg4UI.validate(p),false);assert.match(d.getElementById(p+'CpgValidation').textContent,/untick Start IV fluid/);
  set(p+'PlanSubReferFluid',false);assert.equal(w.MedAssistDengueCpg4UI.validate(p),true);
  set(p+'Phase','recovery phase');assert.equal(d.getElementById(category).value,'no-warning');d.getElementById(calc).click();assert.match(result.textContent,/Recovery phase/);
  set(p+'Haemo','compensated shock');assert.equal(d.getElementById(category).value,'compensated');d.getElementById(calc).click();assert.match(result.querySelector('strong').textContent,/720 mL over 1 hour/);assert.match(d.getElementById(p+'FluidWeightSummary').textContent,/72 kg/);assert.doesNotMatch(d.getElementById(p+'FluidWeightSummary').textContent,/70 kg/);
  set(p+'Haemo','decompensated shock');d.getElementById(calc).click();assert.match(result.querySelector('strong').textContent,/1440 mL over 15/);
  set(group,'paeds');set(p+'Weight',20);set(category,'compensated');set(rate,10);d.getElementById(calc).click();assert.match(result.textContent,/200 mL/);assert.equal(d.getElementById(p+'CpgOralHourlyWrap').classList.contains('hidden'),true);
  set(p+'Weight',25);assert.match(result.textContent,/calculate again/);d.getElementById(calc).click();assert.match(result.textContent,/250 mL/);
  set(group,'adult');assert.doesNotMatch(result.textContent,/250 mL/);assert.equal(d.getElementById(category).value,'decompensated');set(p+'Weight',72);set(p+'Height',175);d.getElementById(calc).click();assert.match(result.querySelector('strong').textContent,/1440 mL/);
  console.log(p,'critical mismatch, daily/hourly units, repeated Calculate, 70 kg cap, zero-IV validation, recovery, shock, paediatric transitions and generated notes PASS');
 }
 set('dfuCpgOralPeriod','24');set('dfuWeight',22);d.getElementById('clReset').click();assert.equal(d.getElementById('dfuWeight').value,'22');assert.equal(d.getElementById('dfuCpgOralPeriod').value,'24');assert.equal(d.getElementById('clCpgOralPeriod').value,'1');assert.equal(d.getElementById('clCpgOralAdequacy').value,'');assert.equal(d.getElementById('dfResult').textContent,'Select a category, then calculate.');
 d.getElementById('dfuReset').click();assert.equal(d.getElementById('dfuCpgOralPeriod').value,'1');assert.equal(d.getElementById('dfuFluidResult').textContent,'Select a category, then calculate.');
 assert.deepEqual(errors,[]);console.log('Reset isolation, clean result, and runtime checks PASS');dom.window.close();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
