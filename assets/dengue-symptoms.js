/* One set of existing adult dengue inputs. Controls are moved, never cloned.
 * Paediatric and non-dengue forms restore the original controls and layout. */
(function () {
  'use strict';
  const byId=id=>document.getElementById(id), layouts=new Map();
  function build(p) {
    const panel=byId(p+'CpgWarningPanel');if(!panel)return;
    const f=p==='dfu', original=document.createElement('div');original.className='combined-original';
    while(panel.firstChild)original.appendChild(panel.firstChild);
    const body=document.createElement('div');body.className='combined-body';
    body.innerHTML=`<h2>Symptoms &amp; daily assessment</h2>
      <p class="helper combined-legend"><span class="combined-red-key" aria-hidden="true"></span>Red boxes contain warning-sign criteria. Record the findings present; interpret them with the illness phase. Liver size is under Examination → Abdomen; HCT / platelet trend is under Investigations → FBC trend.</p>
      <h3>Oral intake, PU &amp; activity</h3><div class="combined-cardinal-grid" id="${p}CombinedCardinal"></div>
      <h3>Symptoms &amp; signs</h3><div class="combined-sign-grid" id="${p}CombinedSigns"></div>
      <div class="combined-associated" id="${p}CombinedAssociated"><h3>Other associated symptoms</h3></div>
      <div class="combined-phase" id="${p}CombinedPhase"></div>
      <details class="combined-interpretation" id="${p}CombinedInterpretation"><summary>Clinician confirmation / additional finding</summary><div id="${p}CombinedOverride"></div></details>
      <div id="${p}CombinedSummary"></div>`;
    panel.append(body,original);
    const l={p,panel,body,original,moves:[],hidden:[],labels:[],enabled:false};
    const move=(node,target,kind)=>{
      if(!node||!target)throw Error('Missing combined symptom control: '+p+' '+kind);
      const marker=document.createComment('symptom home');node.before(marker);
      l.moves.push({node,marker,target,kind});
    };
    const container=id=>byId(p+id), mark=(node,warning=false)=>{
      node.classList.add('combined-field');if(warning)node.classList.add('combined-warning');return node;
    };
    const host=id=>byId(id)?.closest(f?'.dfu-warning-field':'.warning-v208-card');
    const oral=mark(byId(f?'dfuOralIntake':'clDrink').parentElement);
    const urine=mark(f?byId('dfuUrine').parentElement:byId('clUrineInlineCard'),true);
    const activity=mark(byId(p+'Activity').parentElement);
    const oralCard=oral.closest('.card'), symptomCard=byId(p+'Lethargy').closest('.card');
    const associatedCard=f?null:byId('clSymptoms').closest('.card');
    l.hidden=[...new Set([oralCard,symptomCard,associatedCard].filter(Boolean))];
    // The combined component occupies the original symptom section's position.
    const firstCard=associatedCard||symptomCard;
    move(panel,firstCard.parentElement,'panel');l.panelBefore=firstCard;
    move(oral,container('CombinedCardinal'),'oral');move(urine,container('CombinedCardinal'),'urine');move(activity,container('CombinedCardinal'),'activity');
    const qualifier=(key,target)=>{
      const label=byId(p+key).closest('label');label.classList.add('combined-qualifier');
      const span=label.querySelector('span');if(span)span.textContent=span.textContent.replace(/^\d+\.\s*/, '');
      move(label,target,'qualifier');
    };
    qualifier('CpgLowUrine',urine);
    const pain=mark(host(f?'dfuAbdominalPain':'clAbdPain'),true);
    qualifier('CpgIntensePain',pain);
    const bleeding=mark(f?byId('dfuBleedingTendencies').closest('.dfu-bleeding-block'):host('clBleeding'),true);
    const vomiting=mark(host(f?'dfuVomitFrequency':'clVomiting'),true);
    const mental=mark(host(p+'Lethargy'),true);
    const signs=container('CombinedSigns');
    const stool=mark(host(f?'dfuLooseStoolFrequency':'clDiarrhoea'));
    if(f)bleeding.classList.add('combined-bleeding');
    for(const node of [vomiting,stool,pain,mental,bleeding])move(node,signs,'sign');
    for(const key of ['CpgWorse','CpgAccumulation','CpgPostural']){
      const node=mark(byId(p+key).closest('.cpg-warning-item'),true);
      const span=node.querySelector('label span');if(span)span.textContent=span.textContent.replace(/^\d+\.\s*/,'');
      move(node,signs,'sign');
    }
    // Objective findings stay beside their examination or investigation inputs.
    // Reuse the same controls so warning interpretation and saved drafts agree.
    const abdomen=byId(p+'PA').closest('.dengue-pa-wrap');
    const liverSlot=document.createElement('div');liverSlot.id=p+'CpgLiverExam';liverSlot.className='adult-cpg4 cpg-objective-slot hidden';
    abdomen.querySelector('.dengue-pa-additional-grid').before(liverSlot);
    const liver=byId(p+'CpgLiver').closest('.cpg-warning-item');liver.classList.add('cpg-objective-warning');
    const liverLabel=liver.querySelector('label');liverLabel.classList.add('combined-qualifier');
    liverLabel.querySelector('span').textContent='Liver palpable >2 cm below costal margin';
    const hep=byId(p+'PAHepatomegaly').closest('label');
    // The general finding and its >2 cm qualifier share one examination box.
    move(hep,liver,'hepatomegaly');move(liver,liverSlot,'liver examination');
    const fbc=document.createElement('div');fbc.id=p+'CpgFbcTrend';fbc.className='adult-cpg4 cpg-objective-slot hidden';
    fbc.innerHTML='<h3>FBC trend</h3>';
    byId(p+'QuickFbcText').closest('.quick-fbc-card').appendChild(fbc);
    move(byId(p+'SerialFbcCard'),fbc,'serial FBC');
    const lab=byId(p+'CpgLabTrend').closest('.cpg-warning-item');lab.classList.add('cpg-objective-warning');
    lab.querySelector('label span').textContent='Rising HCT with rapidly falling platelets';
    move(lab,fbc,'FBC warning criterion');
    move(mark(host(p+'Seizure')),signs,'sign');
    const sob=f?host('dfuSob'):byId('clSymSOB').closest('.symptom-row');
    sob.classList.add('combined-fluid-sob');
    move(sob,byId(p+'CpgAccumulationSymptoms'),'fluid symptom');
    if(!f){
      // Oral tolerance is recorded once in clDrink, including its own duration.
      move(byId('clSymPoorIntake').closest('.symptom-row'),original,'duplicate');
      move(byId('clSymptoms'),container('CombinedAssociated'),'associated');
      move(byId('clTbScreening'),container('CombinedAssociated'),'TB screening');
      const other=byId('clOtherSymptoms'),label=other.previousElementSibling;
      if(label?.tagName==='LABEL'){move(label,container('CombinedAssociated'),'other');l.labels.push({node:label,old:label.textContent,text:'Additional symptoms / details'});}
      move(other,container('CombinedAssociated'),'other');
      l.oldOral=byId('clDrinkMl24').closest('.warning-v208-inline');
    }else{
      const other=byId('dfuOtherSymptoms'),label=other.previousElementSibling;
      if(label?.tagName==='LABEL'){move(label,container('CombinedAssociated'),'other');l.labels.push({node:label,old:label.textContent,text:'Additional symptoms / details'});}
      move(other,container('CombinedAssociated'),'other');
    }
    // A single entered oral amount is shared with the fluid calculator.
    move(byId(p+'CpgOralHourlyWrap'),oral,'oral amount');
    move(byId(p+'CpgOralAdequacyWrap'),oral,'oral adequacy');
    move(original.querySelector('.cpg-phase-context'),container('CombinedPhase'),'phase');
    move(original.querySelector('.cpg-clinical-interpretation'),container('CombinedOverride'),'override');
    move(byId(p+'CpgWarningSummary'),container('CombinedSummary'),'summary');
    for(const node of [pain,bleeding,host(p+'Seizure'),...(f?[host('dfuSob')]:[])]){
      const label=node.querySelector(':scope > label');
      if(label && /^\d+\./.test(label.textContent))l.labels.push({node:label,old:label.textContent,text:label.textContent.replace(/^\d+\.\s*/,'')});
    }
    const oralLabel=oral.querySelector(':scope > label');l.labels.push({node:oralLabel,old:oralLabel.textContent,text:'Oral intake'});
    const actLabel=activity.querySelector(':scope > label');l.labels.push({node:actLabel,old:actLabel.textContent,text:'Able to do usual activities'});
    const oralField=byId(f?'dfuOralIntake':'clDrink');
    for(const option of oralField.options){l.labels.push({node:option,old:option.textContent,text:({able:'Tolerating oral fluids',good:'Tolerating oral fluids',reduced:'Reduced intake',unable:'Unable to tolerate fluids',poor:'Unable to tolerate fluids'})[option.value]||option.textContent});}
    layouts.set(p,l);
  }
  function enabled(p){return Boolean(layouts.get(p)?.enabled);}
  function refresh(p) {
    const l=layouts.get(p);if(!l)return;
    const active=Boolean(window.MedAssistDengueCpg4UI?.active(p));
    if(active!==l.enabled){
      l.enabled=active;l.panel.classList.toggle('dengue-combined',active);
      l.hidden.forEach(n=>n.classList.toggle('combined-suppressed',active));
      l.oldOral?.classList.toggle('combined-suppressed',active);
      l.labels.forEach(({node,old,text})=>{node.textContent=active?text:old;});
      if(active){
        for(const {node,target,kind} of l.moves){if(kind==='panel')target.insertBefore(node,l.panelBefore);else if(kind==='hepatomegaly')target.prepend(node);else target.appendChild(node);}
        if(p==='cl' && !byId(p+'CpgOralHourly').value && byId('clDrinkMl24').value){
          byId(p+'CpgOralHourly').value=byId('clDrinkMl24').value;byId(p+'CpgOralPeriod').value='24';
        }
      }else{
        for(const {node,marker} of [...l.moves].reverse())marker.after(node);
      }
    }
    if(active){
      if(byId(p+'CpgLiver').checked){
        byId(p+'PAHepatomegaly').checked=true;
        const toggle=document.querySelector(`.dengue-pe-picker input[data-target="${p}PA"]`);
        if(toggle && !toggle.checked){toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}));}
      }
      const confirmed=p==='cl'?byId('clWarningStatus').value==='present':byId('dfuCpgWarningConfirmed').checked;
      if(confirmed)byId(p+'CombinedInterpretation').open=true;
    }
  }
  function oralAmount(p){
    if(!enabled(p))return '';
    const value=byId(p+'CpgOralHourly').value;if(value==='')return '';
    return ` — ${value} mL/${byId(p+'CpgOralPeriod').value==='24'?'24 h':'hour'}`;
  }
  function fluidLines(p){
    if(!enabled(p))return [];
    const lines=[];
    if(byId(p+'CpgDistension').checked)lines.push('+ abdominal swelling / distension');
    const sob=p==='cl'?byId('clSymSOB').checked:byId('dfuSob').value==='yes';
    if(sob){
      let duration='';
      if(p==='cl'){
        const amount=byId('clSymSOBOnset').value,unit=byId('clSymSOBUnit').value;
        if(amount)duration=` x ${amount} ${unit}${amount==='1'?'':'s'}`;
      }else duration=window.dengueDurationSuffix?.('dfuSobDuration')||'';
      lines.push('+ shortness of breath'+duration);
    }
    if(byId(p+'CpgAccumulation').checked)lines.push('Clinical fluid accumulation present.');
    return lines.length?['FLUID ACCUMULATION ASSESSMENT',...lines]:[];
  }
  function init(){
    for(const p of ['cl','dfu'])build(p);
    window.MedAssistDengueSymptoms={enabled,refresh,oralAmount,fluidLines};
    for(const p of ['cl','dfu'])window.MedAssistDengueCpg4UI?.refresh(p);
  }
  if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
