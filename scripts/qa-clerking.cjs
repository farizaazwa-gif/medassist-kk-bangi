// Optional real-browser regression run. Requires Playwright; set MEDASSIST_BROWSER
// to an installed Chromium executable if Playwright's bundled browser is unavailable.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const artifactDir=process.env.MEDASSIST_QA_OUTPUT || path.join(root,'../work/medassist-qa');
fs.mkdirSync(artifactDir,{recursive:true});
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.join(root,pathname==='/'?'index.html':pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 const type=file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.webp')?'image/webp':'text/plain';
 res.setHeader('Content-Type',type);res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.MEDASSIST_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
 const context=await browser.newContext({viewport:{width:1365,height:900},timezoneId:'Asia/Kuala_Lumpur',permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),errors=[],dialogs=[];page.setDefaultTimeout(8000);
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
 await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.MedAssistDengueCpg4UI && document.querySelector('#clVomitLast24'));
 const activate=async(mode)=>page.evaluate(mode=>{window.showPage('clerking');window.setDengueTemplate(mode);},mode);
 const set=async(id,value)=>{const e=page.locator('#'+id);const tag=await e.evaluate(x=>x.tagName);if(tag==='SELECT'){await e.focus();await e.selectOption(String(value));}else if(typeof value==='boolean')await e.setChecked(value);else await e.fill(String(value));};
 const value=id=>page.locator('#'+id).inputValue();
 const text=id=>page.locator('#'+id).textContent();
 for(const p of ['cl','dfu']){
  await activate(p==='cl'?'new':'followup');
  const group=p==='cl'?'dfGroup':'dfuGroup',calc=p==='cl'?'dfCalculate':'dfuFluidCalculate',result=p==='cl'?'dfResult':'dfuFluidResult';
  await set(p+'Weight',60);await set(p+'Height',170);await set(p+'Sex','Male');
  await set(p==='cl'?'clDxDay':'dfuDayIllness',5);await set(p+'CpgDxCertainty','suspected');
  assert.equal(await page.locator('#'+p+'CpgWorse').isVisible(),true);
  assert.equal(await page.locator('#'+p+'CpgWarningPanel .combined-warning').count(),8);
  assert.equal(await page.locator('#'+p+'CpgWarningPanel input[id$=CpgLiver],#'+p+'CpgWarningPanel input[id$=CpgLabTrend]').count(),0);
  assert.equal(await page.locator('#'+p+'CpgFbcTrend #'+p+'CpgLabTrend').isVisible(),true);
  assert.equal(await page.locator('#'+p+'CpgFbcTrend #'+p+'SerialFbcCard').count(),1);
  assert.match(await page.locator('#'+p+'CpgAccumulation').evaluate(e=>e.closest('.cpg-warning-item').textContent),/Abdominal swelling.*[Ss]hortness of breath.*Symptoms alone do not confirm/s);
  const sob=p==='cl'?'clSymSOB':'dfuSob';
  assert.equal(await page.locator('#'+p+'CpgAccumulationSymptoms #'+sob).count(),1);
  assert.equal(await page.locator('#'+sob).count(),1,'SOB is recorded once');
  for(const key of ['CpgSevereBleeding','CpgSevereLeak','CpgUnstableComorbid','CpgSevereDehydration']){
   await set(p+key,true);
   const assessed=await page.evaluate(p=>MedAssistDengueCpg4UI.referral(p),p);
   assert.equal(assessed.needsHospital,true);
   assert.equal(assessed.group==='C',['CpgSevereBleeding','CpgSevereLeak'].includes(key));
   await set(p+key,false);
  }
  await set(p+'CpgDistension',true);await set(sob,p==='cl'?true:'yes');
  assert.equal(await page.locator('#'+p+'CpgAccumulation').isChecked(),false);
  assert.equal(await page.locator('#'+p+'CpgSevereLeak').isChecked(),false);
  assert.equal(await page.evaluate(p=>MedAssistDengueCpg4UI.warningData(p).positive.length,p),0,'symptoms alone do not confirm fluid accumulation');
  await set(p+'Phase','critical phase');
  assert.equal(await page.evaluate(p=>MedAssistDengueCpg4UI.warningData(p).positive.length,p),0,'critical phase alone does not turn SOB/distension into fluid accumulation');
  await set(p+'CpgAccumulation',true);assert.match(await text(p+'CpgWarningSummary'),/clinical fluid accumulation/);
  await set(p+'CpgAccumulation',false);await set(p+'CpgDistension',false);await set(sob,p==='cl'?false:'no');await set(p+'Phase','febrile phase');
  assert.equal(await page.locator('#'+p+'CpgWarningPanel input[id$=CpgSevereBleeding]').count(),0);
  assert.match(await text(p+'CpgWarningSummary'),/Review pending/);
  const shared=[p+'VomitLast24',p+'StoolLast24',p+'Lethargy',p+'Activity',p+'Urine',p==='cl'?'clDrink':'dfuOralIntake',p==='cl'?'clBleeding':'dfuBleedingTendencies',p==='cl'?'clAbdPain':'dfuAbdominalPain',p+'OtherSymptoms',p+'CpgOralHourly'];
  for(const id of shared){
   assert.equal(await page.locator('#'+id).count(),1,id+' must have one input');
   assert.equal(await page.locator('#'+id).isVisible(),true,id+' must be visible');
   assert.equal(await page.locator('#'+id).evaluate((e,p)=>e.closest('.dengue-combined')?.id===p+'CpgWarningPanel',p),true,id+' must be in the combined component');
  }
  assert.equal(await page.locator('#'+p+'CpgHistoryVomiting').isVisible(),false);
  if(p==='cl'){
   assert.equal(await page.locator('#clSymPoorIntake').isVisible(),false);
   assert.equal(await page.locator('#clDrinkMl24').isVisible(),false);
   await set('clSymCough',true);await set('clSymCoughOnset',2);await set('clSymCoughUnit','week');
   assert.equal(await page.locator('#clTbScreening').isVisible(),true,'TB questions remain accessible');
   await set('clSymCough',false);
  }
  await set(p+'VomitLast24',4);
  assert.match(await text(p+'CpgWarningSummary'),/Findings recorded: persistent vomiting.*febrile phase/);
  assert.equal(await page.evaluate(p=>MedAssistDengueCpg4UI.warningData(p).positive.length,p),0);
  await set(p+'CpgNearCritical',true);
  assert.match(await text(p+'CpgWarningSummary'),/Warning signs present: persistent vomiting/);
  await set(p+'CpgNearCritical',false);
  await set(p+'Phase','critical phase');await set(p+'VomitLast24',3);await set(p+'StoolLast24',4);
  assert.equal(await value(p+'VomitLast24'),'3');
  assert.equal(await page.evaluate(p=>MedAssistDengueCpg4UI.warningData(p).positive.length,p),0);
  await set(p+'VomitLast24',4);assert.match(await page.evaluate(p=>MedAssistDengueCpg4UI.warningData(p).positive.join(' '),p),/persistent vomiting/);
  assert.equal(await value(p+'VomitLast24'),'4');
  await set(p+'Lethargy','yes');assert.match(await text(p+'CpgWarningSummary'),/lethargy/);await set(p+'Lethargy','no');
  if(p==='cl')await set('clBleeding','yes');else await page.locator('#dfuBleedingTendencies input').first().check();
  assert.match(await text(p+'CpgWarningSummary'),/bleeding manifestation/);
  if(p==='cl')await set('clBleeding','no');else await page.locator('#dfuBleedingTendencies input').first().uncheck();
  await set(p+'VomitLast24',0);await set(p+'CpgWorse',true);assert.match(await page.evaluate(p=>MedAssistDengueCpg4UI.warningData(p).positive.join(' '),p),/no clinical improvement/);
  await set(p+'CpgWorse',false);await set(p+'CpgIntensePain',true);
  assert.equal(await value(p==='cl'?'clAbdPain':'dfuAbdominalPain'),'yes');
  await set(p==='cl'?'clAbdPain':'dfuAbdominalPain','no');assert.equal(await page.locator('#'+p+'CpgIntensePain').isChecked(),false);
  await set(p+'CpgLowUrine',true);assert.equal(await value(p==='cl'?'clUrine':'dfuUrine'),p==='cl'?'yes':'reduced');
  await set(p==='cl'?'clUrine':'dfuUrine',p==='cl'?'no':'normal');assert.equal(await page.locator('#'+p+'CpgLowUrine').isChecked(),false);
  const paToggle=page.locator(`.dengue-pe-picker input[data-target="${p}PA"]`);
  await paToggle.check();
  assert.equal(await page.locator('.dengue-pa-wrap #'+p+'CpgLiver').isVisible(),true);
  await set(p+'PAHepatomegaly',true);assert.equal(await page.locator('#'+p+'CpgLiver').isChecked(),false,'hepatomegaly alone does not confirm >2 cm');
  await set(p+'CpgLiver',true);assert.match(await page.evaluate(p=>denguePaFinding(p),p),/liver palpable >2 cm below costal margin/);
  await set(p+'PAHepatomegaly',false);assert.equal(await page.locator('#'+p+'CpgLiver').isChecked(),false);
  await set(p+'CpgLiver',true);assert.equal(await page.locator('#'+p+'PAHepatomegaly').isChecked(),true);
  await paToggle.uncheck();assert.equal(await page.locator('#'+p+'CpgLiver').isChecked(),false,'unexamined abdomen must not retain >2 cm warning');
  await paToggle.check();
  for(const field of ['CpgPostural','CpgLiver','CpgAccumulation','CpgLabTrend']){await set(p+field,true);assert.ok(await page.evaluate(p=>MedAssistDengueCpg4UI.warningData(p).positive.length>0,p));await set(p+field,false);}
  await set(p+'CpgLiver',true);await set(p+'CpgLabTrend',true);await set(p+'CpgDistension',true);await set(sob,p==='cl'?true:'yes');
  await set(p+'Haemo','compensated shock');await page.locator('#'+calc).click();assert.match(await text(result),/600 mL over 1 hour/);
  assert.match(await text(p+'CpgWarningSummary'),/^Severe dengue: compensated shock/);assert.doesNotMatch(await text(p+'CpgWarningSummary'),/No warning signs/);
  await set(p+'PlanOption','refer');await set(p+'CpgDxReviewed',true);await page.locator('#'+p+'Generate').click();
  assert.match(await value(p+'Output'),/General \/ perfusion examination: not documented/);
  assert.doesNotMatch(await value(p+'Output'),/warm peripheries|good PV|crt < 2 sec/);
  await page.locator('#'+p+'GeneralExamToggle').click();
  await set(p+'GeneralMental','restless');await set(p+'GeneralComfort','ill-looking');
  await set(p+'GeneralCrt','very prolonged crt');await set(p+'GeneralPeripheries','cold, clammy peripheries');await set(p+'GeneralPulseVolume','weak & thready PV');
  if(p==='cl')await set('clDrink','unable');
  await set(p+'CpgDxReviewed',true);await page.locator('#'+p+'Generate').click();
  for(const output of [p+'Output',p+'ReferralOutput']){
   assert.match(await value(output),/restless.*very prolonged crt.*cold, clammy peripheries.*weak & thready PV/);
   assert.match(await value(output),/IV NS 600 mL over 1 hour\. Started/);
   assert.match(await value(output),/Reassess CCTVR, BP, HCT & UO\./);
   assert.match(await value(output),/Refer ED\./);
   assert.match(await value(output),/liver palpable >2 cm below costal margin/);
   assert.match(await value(output),/rising HCT with rapidly falling platelets/i);
   assert.match(await value(output),/FLUID ACCUMULATION ASSESSMENT\n\+ abdominal swelling \/ distension\n\+ shortness of breath/);
   assert.doesNotMatch(await value(output),/Clinical fluid accumulation present\.|no SOB|no shortness of breath/);
   assert.equal((await value(output)).match(/\+ shortness of breath/g)?.length,1);
   assert.doesNotMatch(await value(output),/isotonic crystalloid|Emergency transfer|do not delay to finish infusion/);
   assert.doesNotMatch(await value(output),/warm peripheries|good PV|crt < 2 sec|no poor oral intake/);
  }
  assert.match(await value(p+'Output'),/600 mL over 1 hour/);assert.match(await value(p+'ReferralOutput'),/600 mL over 1 hour/);
  assert.equal(await page.locator('#'+p+'Output').isEditable(),true);
  await set(p+'Haemo','decompensated shock');assert.match(await text(result),/1200 mL over 15/);
  await set(p+'CpgAccumulation',true);await set(p+'CpgDxReviewed',true);await page.locator('#'+p+'Generate').click();
  for(const output of [p+'Output',p+'ReferralOutput'])assert.match(await value(output),/Clinical fluid accumulation present\./);
  await set(p+'CpgAccumulation',false);await set(p+'CpgDistension',false);await set(sob,p==='cl'?false:'no');
  await set(p+'CpgLiver',false);await set(p+'PAHepatomegaly',false);await set(p+'CpgLabTrend',false);
  await set(p+'Haemo','haemodynamically stable');await set(p+'Phase','febrile phase');
  await set(p+'GeneralMental','alert');await set(p+'GeneralComfort','comfortable');await set(p+'GeneralCrt','crt < 2 sec');await set(p+'GeneralPeripheries','warm peripheries');await set(p+'GeneralPulseVolume','good PV');
  if(p==='cl')await set('clDrink','able');
  await set(p+'PlanOption',p==='cl'?'outpatient':'monitoring');
  if(p==='dfu')await set('dfuNextTca','');
  await set(p+'CpgDxReviewed',true);await page.locator('#'+p+'Generate').click();
  await set(p+'CpgOralHourly',1500);await set(p+'CpgOralPeriod','24');await set(p+'CpgDxReviewed',true);await page.locator('#'+p+'Generate').click();
  const note=await value(p+'Output');assert.match(note,/alert, comfortable.*crt < 2 sec, warm peripheries, good PV/);assert.match(note,/1500 mL\/24 h/);assert.doesNotMatch(note,/no poor oral intake/);assert.match(note,/Repeat FBC CM\./);assert.doesNotMatch(note,/serial FBC as clinically indicated|loose stool[^\n]*\(DF warning sign\)|vomiting[^\n]*\(DF warning sign\)/i);
  await set(p+'Weight',72);await set(p+'Height',175);await set(p==='cl'?'dfState':'dfuFluidState','febrile');
  await set(p+'CpgOralHourly',1000);await set(p+'CpgOralPeriod','24');await set(p+'CpgOralAdequacy','inadequate');
  await page.locator('#'+calc).click();assert.match(await text(result),/68\.3 mL\/hour/);
  await set(p+'CpgOralPeriod','1');await set(p+'CpgOralAdequacy','inadequate');assert.match(await text(result),/component: 0 mL\/hour/);
  await set(group,'paeds');assert.equal(await page.locator('#'+p+'CpgWarningPanel').isVisible(),false);assert.equal(await page.locator('#'+p+'Phase').isVisible(),true);
  assert.equal(await page.locator('#'+p+'CpgLiver').isVisible(),false);assert.equal(await page.locator('#'+p+'CpgLabTrend').isVisible(),false);
  assert.equal(await page.locator('#'+p+'PreviousLabOptionalCard #'+p+'SerialFbcCard').count(),1);
  assert.equal(await page.locator('.dengue-pa-wrap #'+p+'PAHepatomegaly').count(),1);
  assert.equal(await page.locator('#'+sob).isVisible(),true);assert.equal(await page.locator('#'+p+'CpgDistension').isVisible(),false);
  if(p==='cl')assert.equal(await page.locator('#clWarningStatus').isVisible(),true);
  await set(p+'Weight',20);await set(p==='cl'?'dfState':'dfuFluidState','compensated');await page.locator('#'+calc).click();assert.match(await text(result),/200 mL/);
  await set(p+'Weight',25);assert.match(await text(result),/calculate again/);await page.locator('#'+calc).click();assert.match(await text(result),/250 mL/);
  await set(group,'adult');assert.doesNotMatch(await text(result),/250 mL/);
  assert.equal(await page.locator('#'+p+'CpgWarningPanel .combined-warning').count(),8);
  assert.equal(await page.locator('#'+p+'CpgFbcTrend #'+p+'CpgLabTrend').isVisible(),true);
  assert.equal(await value(p+'CpgOralHourly'),'1000');
  if(p==='cl'){
   await set('clDxType','Acute upper respiratory tract infection');assert.equal(await page.locator('#clCpgWarningPanel').isVisible(),false);assert.equal(await page.locator('#clSymHeadache').isVisible(),true);assert.equal(await page.locator('#clSymPoorIntake').isVisible(),true);
   await set('clDxType','Dengue fever');assert.equal(await page.locator('#clDrink').evaluate(e=>Boolean(e.closest('.dengue-combined'))),true);assert.equal(await value('clCpgOralHourly'),'1000');
  }assert.equal(await page.locator('#dengueReferralToast').isVisible(),false);
  await page.locator('#clerkingFloatingReset').click();await page.waitForTimeout(100);assert.equal(await value(p+'GeneralMental'),'alert');
  for(const key of ['CpgLiver','CpgLabTrend','CpgAccumulation','CpgDistension','PAHepatomegaly'])assert.equal(await page.locator('#'+p+key).isChecked(),false);
  console.log(p,': warning criteria, concise plans, notes/referrals, fluids, paediatric switch and reset PASS');
 }
 // Copy reads the editable note, and resetting one clerking leaves the other intact.
 await activate('new');await set('clOutput','Synthetic edited note\no/e:\nClinician edited examination — keep this text.');await page.locator('#clCopy').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'Synthetic edited note\no/e:\nClinician edited examination — keep this text.');
 await page.evaluate(()=>document.getElementById('htnCombinedImportStatus').textContent='Detected: BP 120/80.');await activate('followup');await set('dfuWeight',22);await activate('new');await page.locator('#clerkingFloatingReset').click();assert.equal(await value('dfuWeight'),'22');
 await page.evaluate(()=>window.showPage('nnj'));assert.equal(await page.locator('#dengueReferralToast').isVisible(),false);
 await set('nnjBirthDate24','2026-10-13');await set('nnjAssessmentDate24','2026-10-17');await set('nnjValue',10);
 await set('nnjCordTsh',8.25);await page.locator('#nnjCalc').click();assert.match(await value('nnjOutput'),/Cord TSH: 8\.25 mIU\/L/);
 await set('nnjPlan','refer');await page.locator('#nnjCalc').click();assert.match(await value('nnjReferralLetter'),/Cord TSH: 8\.25 mIU\/L/);
 await set('nnjCordTsh','');await page.locator('#nnjCalc').click();assert.doesNotMatch(await value('nnjOutput'),/Cord TSH/);
 await set('nnjCordTsh',0);await page.locator('#nnjCalc').click();assert.match(await value('nnjOutput'),/Cord TSH: 0 mIU\/L/);
 await set('nnjCordTsh',-1);const before=await value('nnjOutput');await page.locator('#nnjCalc').click();assert.equal(await value('nnjOutput'),before);assert.match(dialogs.at(-1),/non-negative cord TSH/);
 await set('nnjCordTsh',8);await set('nnjValue',35);await page.locator('#nnjCalc').click();assert.match(await value('nnjOutput'),/Urgent escalation of care/);
 await page.locator('#clerkingFloatingReset').click();assert.equal(await value('nnjCordTsh'),'');assert.equal(await value('dfuWeight'),'22');
 assert.equal(await text('htnCombinedImportStatus'),'Detected: BP 120/80.');
 console.log('NNJ cord TSH: blank / zero / decimal / negative, referral, urgent escalation, reset isolation and copy PASS');
 // Navigation and primary generated outputs across the remaining clinical modules.
 const workflows=[['dm','dmGenerate','dmOutput'],['htn','htnGenerate','htnOutput'],['rme1','rmeGenerateNote','rmeOutput'],['iucd','iucdGenerate','iucdOutput']];
 for(const [route,button,out] of workflows){await page.evaluate(route=>window.showPage(route),route);await page.locator('#'+button).click();assert.ok((await value(out)).length>20,route+' output');assert.equal(await page.locator('#'+out).isEditable(),true);}
 for(const type of ['adhd','autism']){await page.evaluate(type=>{window.showPage('neurodevelopment');window.setNeuroTemplate(type)},type);await page.locator('#generate'+(type==='adhd'?'Adhd':'Autism')+'Note').click();assert.ok((await value(type+'NoteOutput')).length>20);}
 console.log('DM / HPT / RME1 / IUCD / ADHD / Autism generation and editable outputs PASS');
 for(const width of [1365,390]){
  await page.setViewportSize({width,height:900});
  for(const mode of ['new','followup']){await activate(mode);const p=mode==='new'?'cl':'dfu';await page.waitForFunction(p=>!!document.querySelector('#sectionQuickBarList [data-target-id="'+p+'CpgWarningPanel"]'),p);await page.locator('#'+p+'CpgPostural').scrollIntoViewIfNeeded();await page.waitForTimeout(200);assert.equal(await page.locator('#'+p+'CpgPostural').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,'horizontal overflow '+mode+' '+width);await page.screenshot({path:path.join(artifactDir,`${mode}-${width}.png`)});await page.locator('#'+p+'CpgWarningPanel').screenshot({path:path.join(artifactDir,`warning-panel-${mode}-${width}.png`)});
   await page.locator('#'+p+'CpgReferralFindings').screenshot({path:path.join(artifactDir,`referral-panel-${mode}-${width}.png`)});
   await page.locator('#'+p+'CpgAccumulation').locator('xpath=../..').screenshot({path:path.join(artifactDir,`fluid-symptoms-${mode}-${width}.png`)});
   await page.locator(`.dengue-pe-picker input[data-target="${p}PA"]`).check();
   await page.locator('#'+p+'PA').evaluate(e=>e.closest('.dengue-pa-wrap').scrollIntoView({block:'center'}));
   await page.locator('#'+p+'CpgLiverExam').screenshot({path:path.join(artifactDir,`liver-exam-${mode}-${width}.png`)});
   await set(p+'QuickFbcDate','2026-10-17');await set(p+'QuickFbcText','Hb 14.0\nHct 42\nWBC 3.0\nPlt 90');
   assert.equal(await page.locator('#'+p+'CpgLabTrend').isChecked(),false,'single FBC does not auto-confirm the trend');
   assert.equal(await page.locator('#'+p+'SerialFbcCard').isVisible(),true);
   await page.locator('#'+p+'CpgFbcTrend').screenshot({path:path.join(artifactDir,`fbc-trend-${mode}-${width}.png`)});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,'objective fields overflow '+mode+' '+width);
  }
  await page.evaluate(()=>window.showPage('nnj'));await page.waitForFunction(()=>document.querySelector('#sectionQuickBarList')?.textContent.includes('Quick TSB Assessment'));await page.locator('#nnjCordTsh').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,'NNJ overflow');await page.screenshot({path:path.join(artifactDir,`nnj-${width}.png`)});
 }
 assert.deepEqual(errors,[]);console.log('Desktop/mobile layouts and browser runtime PASS');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
