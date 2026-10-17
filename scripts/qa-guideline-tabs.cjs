// Regression: guidelines open once in a separate tab without navigating,
// reloading or changing any current clerking input or editable note.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.join(root,pathname==='/'?'index.html':pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'text/plain');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.MEDASSIST_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
  const context=await browser.newContext({viewport:{width:1365,height:900},timezoneId:'Asia/Kuala_Lumpur'}),page=await context.newPage(),errors=[],navigations=[];
  page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push(frame.url());});
  await page.evaluate(()=>{window.__clerkingSession='unchanged-session';});
  const set=async(id,value)=>{const field=page.locator('#'+id);await field.focus();if(typeof value==='boolean')await field.setChecked(value);else if(await field.evaluate(e=>e.tagName)==='SELECT')await field.selectOption(String(value));else await field.fill(String(value));};
  const snapshot=()=>page.evaluate(()=>({
   url:location.href,session:window.__clerkingSession,
   fields:[...document.querySelectorAll('#dengueNewCaseTemplate input,#dengueNewCaseTemplate select,#dengueNewCaseTemplate textarea,#dengueFollowUpTemplate input,#dengueFollowUpTemplate select,#dengueFollowUpTemplate textarea')].map(e=>({id:e.id,value:e.value,checked:e.checked})),
   active:[...document.querySelectorAll('#dengueNewCaseTemplate,#dengueFollowUpTemplate')].map(e=>({id:e.id,hidden:e.classList.contains('hidden')}))
  }));
  let checked=0;
  for(const p of ['cl','dfu']){
   await page.evaluate(p=>{showPage('clerking');setDengueTemplate(p==='cl'?'new':'followup');},p);
   await set(p+'Age',42);await set(p+'Weight',60);await set(p+'Height',170);await set(p+'Sex','Male');
   await set(p==='cl'?'clDxDay':'dfuDayIllness',4);await set(p+'CpgDxCertainty','suspected');
   await set(p+'OtherSymptoms','Synthetic history\nKeep this unsaved clerking text.');await set(p+'CpgDistension',true);
   await set(p+'QuickFbcDate','2026-10-18');await set(p+'QuickFbcText','Hb 14.0\nHct 42\nWBC 3.0\nPlt 120');
   await set(p+'PlanOption','refer');await set(p+'PlanSubReferFluid',false);
   await set(p+'CpgDxReviewed',true);await page.locator('#'+p+'Generate').click();
   assert.match(await page.locator('#'+p+'Output').inputValue(),/Suspected dengue/);
   const referral=await page.locator('#'+p+'ReferralOutput').inputValue();assert.match(referral,/Suspected dengue/);
   await set(p+'ReferralOutput',referral+'\nSynthetic manual edit — preserve exactly.');
   const form=page.locator('#'+(p==='cl'?'dengueNewCaseTemplate':'dengueFollowUpTemplate'));
   for(const width of [1365,390]){
    await page.setViewportSize({width,height:900});
    await form.locator('.fluid-reference').evaluate(e=>{for(let n=e;n;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;});
    // Test the previously faulty control first, then every visible local CPG/IV link.
    const refs=[...(p==='cl'?[page.locator('#openAdultDengueCpg')]:[]),...await form.locator('a[href^="docs/dengue-"]:not(#openAdultDengueCpg)').all()];
    for(const link of refs){
     if(!await link.isVisible())continue;
     await link.focus();const before=await snapshot();
     const opened=context.waitForEvent('page');
     if(width===390)await link.press('Enter');else await link.click();
     const guide=await opened;await guide.waitForLoadState('domcontentloaded');
     assert.match(guide.url(),/\/docs\/dengue-(?:cpg4-reference|iv-guide)\.html/);
     assert.equal(await guide.evaluate(()=>window.opener),null,'guideline has no access to the original window');
     assert.equal(page.url(),before.url,'guideline click must never navigate the original MedAssist tab');
     assert.deepEqual(await snapshot(),before,'all unsaved inputs, generated/manual notes and active form must remain unchanged');
     assert.equal(context.pages().length,2,'one click opens exactly one guideline tab');
     await guide.close();assert.equal(context.pages().length,1);checked++;
    }
   }
   console.log(p+': all visible CPG/IV links preserve both clerking forms, editable note, session and URL on desktop/mobile PASS');
  }
  assert.ok(checked>=12);assert.deepEqual(navigations,[],'original tab must not reload');assert.deepEqual(errors,[]);
  console.log(checked+' guideline openings PASS');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
