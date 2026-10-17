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
  const activateCurrent=()=>activate(p==='cl'?'new':'followup');
  const reset=()=>page.locator('#clerkingFloatingReset').click();
  const generate=()=>page.locator('#'+p+'Generate').click();
  await activateCurrent();await reset();await generate();
  assert.match(await value(p+'Output'),/Diagnosis pending clinical assessment/);
  assert.equal(await text(p+'CpgValidation'),'');
  const plans=await page.locator('#'+p+'PlanOption option').evaluateAll(es=>es.map(e=>e.value));
  for(const option of plans){
   await set(p+'PlanOption',option);await generate();
   assert.ok((await value(p+'Output')).length>20,option+' always generates');
   assert.doesNotMatch(await value(p+'Output'),/NaN|undefined/);
   if(option==='refer'){
    assert.match(await value(p+'Output'),/IV fluid prescription pending assessment/);
    assert.doesNotMatch(await value(p+'Output'),/Started /);
    assert.ok((await value(p+'ReferralOutput')).length>20);
   }
  }
  await set(p+'PlanOption','antibiotic');await set(p+'PlanAbxRegimen','');await generate();
  assert.ok((await value(p+'Output')).length>20,'incomplete antimicrobial selection still generates');
  await set(p==='cl'?'dfGroup':'dfuGroup','paeds');await set(p+'Weight',0);await set(p+'PlanOption','refer');await generate();
  assert.match(await value(p+'Output'),/IV fluid prescription pending assessment/);assert.doesNotMatch(await value(p+'Output'),/Started /);
  await reset();await set(p+'Age',42);await set(p+'Weight',60);await set(p+'Height',170);await set(p+'Sex','Male');
  await set(p==='cl'?'clDxDay':'dfuDayIllness',4);await set(p+'CpgDxCertainty','suspected');await set(p+'CpgDxReviewed',true);await generate();
  const base=await value(p+'Output');
  const edited='Manual header '+p+'\n'+base.replace('o/e:\n','o/e:\nManual examination detail '+p+'\n').replace(/allergy history to medications: [^\n]*\n/,'')+'\nManual footer '+p;
  await set(p+'Output',edited);await set(p+'OtherSymptoms','Updated symptom from form');await generate();
  let note=await value(p+'Output');
  for(const phrase of ['Manual header '+p,'Manual examination detail '+p,'Manual footer '+p,'Updated symptom from form'])assert.ok(note.includes(phrase),phrase);
  assert.doesNotMatch(note,/allergy history to medications:/);
  for(let i=0;i<3;i++){await generate();assert.equal(await value(p+'Output'),note,'regeneration must be idempotent');}
  await set(p+'PlanExtra','Updated plan from form.');await generate();assert.match(await value(p+'Output'),/Updated plan from form/);
  note=await value(p+'Output');await set(p+'Output',note.replace(/DIAGNOSIS: [^\n]*/,'DIAGNOSIS: Clinician manual wording '+p));
  await set(p==='cl'?'clDxDay':'dfuDayIllness',5);await set(p+'CpgDxReviewed',true);await generate();
  assert.match(await value(p+'Output'),/DIAGNOSIS: Clinician manual wording/);
  assert.match(await text(p+'OutputHint'),/edited lines also changed/);
  await set(p+'PlanOption','refer');await set(p+'PlanSubReferFluid',false);await generate();
  const letter=await value(p+'ReferralOutput');await set(p+'ReferralOutput',letter+'\nManual referral detail '+p);
  await set(p+'OtherSymptoms','Later form symptom');
  assert.match(await value(p+'ReferralOutput'),/Manual referral detail/,'form input must not erase the edited letter');
  await generate();assert.match(await value(p+'ReferralOutput'),/Later form symptom/);assert.match(await value(p+'ReferralOutput'),/Manual referral detail/);
  await set(p+'PlanOption',p==='cl'?'outpatient':'monitoring');await generate();
  await set(p+'PlanOption','refer');await generate();
  assert.equal((await value(p+'ReferralOutput')).split('Manual referral detail').length-1,1);
  for(const [field,button] of [[p+'Output',p+'Copy'],[p+'ReferralOutput',p+'CopyReferral']]){
   const content=await value(field);await page.locator('#'+button).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),content);
  }
  const beforeSwitch=await value(p+'Output');await page.evaluate(()=>showPage('dm'));await activateCurrent();assert.equal(await value(p+'Output'),beforeSwitch);
  for(const width of [1365,390]){
   await page.setViewportSize({width,height:900});await generate();
   assert.match(await value(p+'Output'),/Manual header/);assert.match(await value(p+'ReferralOutput'),/Manual referral detail/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
   await page.locator('#'+p+'OutputHint').scrollIntoViewIfNeeded();await page.screenshot({path:artifactDir+'/regeneration-'+p+'-'+width+'.png'});
  }
  await page.setViewportSize({width:1365,height:900});
  await page.locator('#unifiedDraftSaveButton').click();await page.locator('#unifiedDraftName').fill('Q-REG-'+p);await page.locator('#unifiedDraftConfirm').click();
  await reset();await generate();await set(p+'Output',(await value(p+'Output'))+'\nDifferent patient manual note');
  await page.locator('.unified-draft-item').filter({hasText:'Q-REG-'+p}).click();
  await page.waitForFunction(p=>document.getElementById(p+'Output').value==='',p);await generate();
  assert.doesNotMatch(await value(p+'Output'),/Different patient manual note|Manual header/,'opening a draft must clear another patient merge state');
  await reset();assert.equal(await value(p+'Output'),'');await generate();assert.doesNotMatch(await value(p+'Output'),/Manual header|Manual referral detail/);
  console.log(p+': all plan paths, blank inputs, manual additions/edits/deletions, repeated generation, overlap review, referral, copy, mobile and reset/draft isolation PASS');
 }
 assert.deepEqual(errors,[]);assert.ok(dialogs.every(d=>['Note copied.','Referral letter copied.','Reset the current dengue clerking?'].includes(d)),JSON.stringify(dialogs));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
