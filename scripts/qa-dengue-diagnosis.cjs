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
 const type=file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.webp')?'image/webp':'text/plain';
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
  await set(p==='cl'?'clDxDay':'dfuDayIllness',4);
  await set(p+'Output','Existing editable note');
  await page.locator('#'+p+'Generate').click();
  assert.equal(await value(p+'Output'),'Existing editable note');
  assert.match(await text(p+'CpgValidation'),/Select suspected or confirmed dengue/);
  await set(p+'CpgDxCertainty','confirmed');await set(p+'CpgDxReviewed',true);
  await page.locator('#'+p+'Generate').click();assert.match(await text(p+'CpgValidation'),/laboratory evidence/);
  await set(p+'CpgDxEvidence','NS1 positive 17/10/2026');
  assert.equal(await page.locator('#'+p+'CpgDxReviewed').isChecked(),false);
  await set(p+'CpgDxReviewed',true);await page.locator('#'+p+'Generate').click();
  const first=await value(p+'Output');
  assert.match(first,/Confirmed dengue without warning signs, D4, febrile phase, not in shock, NKMI\./);
  assert.match(first,/Dengue confirmation: NS1 positive 17\/10\/2026/);
  assert.doesNotMatch(first,/without classified|Group [ABC]/);
  await set(p+'Phase','critical phase');assert.equal(await page.locator('#'+p+'CpgDxReviewed').isChecked(),false);
  await page.locator('#'+p+'Generate').click();assert.equal(await value(p+'Output'),first);
  await set(p+'CpgDxReviewed',true);await set(p+'PlanExtra','Review as arranged.');
  assert.equal(await page.locator('#'+p+'CpgDxReviewed').isChecked(),true);
  await page.locator('#'+p+'Generate').click();assert.match(await value(p+'Output'),/D4, critical phase, not in shock/);
  await set(p+'Output','Manual edit — keep exactly.');await page.locator('#'+p+'Copy').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'Manual edit — keep exactly.');
  for(const width of [1365,390]){
   await page.setViewportSize({width,height:900});
   await page.locator('#'+p+'CpgDxCertainty').scrollIntoViewIfNeeded();await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
   await page.screenshot({path:artifactDir+'/diagnosis-'+p+'-'+width+'.png'});
   const opened=context.waitForEvent('page');await page.locator('#'+p+'CpgIvdGuide').click();const guide=await opened;await guide.waitForLoadState();await guide.setViewportSize({width,height:900});
   assert.ok(guide.url().includes('/docs/dengue-iv-guide.html'));
   assert.match(await guide.textContent('body'),/5,400 mL/);assert.match(await guide.textContent('body'),/IV NS 1200 mL over 15–30 minutes/);
   assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
   assert.equal(await guide.evaluate(()=>Array.from(document.querySelectorAll('nav a')).every(a=>document.getElementById(a.hash.slice(1)))),true);
   await guide.screenshot({path:artifactDir+'/iv-guide-'+width+'.png',fullPage:true});await guide.close();
  }
  await page.setViewportSize({width:1365,height:900});
  await page.locator('#clerkingFloatingReset').click();await page.waitForTimeout(100);
  assert.equal(await value(p+'CpgDxCertainty'),'');assert.equal(await value(p+'CpgDxEvidence'),'');assert.equal(await page.locator('#'+p+'CpgDxReviewed').isChecked(),false);
  console.log(p+': blank/confirmed validation, review invalidation, manual copy, reset, desktop/mobile guide PASS');
 }
 assert.deepEqual(errors,[]);assert.ok(dialogs.every(d=>['Note copied.','Reset the current dengue clerking?'].includes(d)),JSON.stringify(dialogs));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
