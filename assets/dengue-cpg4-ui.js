(function () {
  "use strict";
  if (typeof document === "undefined") return;
  const C = window.MedAssistDengueCpg4;
  const el = id => document.getElementById(id);
  const val = id => el(id)?.value ?? "";
  const on = id => Boolean(el(id)?.checked);
  const setText = (id,text) => { if(el(id) && el(id).textContent!==text) el(id).textContent=text; };
  const setValue = (id,text) => { if(el(id) && el(id).value!==String(text)) el(id).value=text; };
  const cfg = p => p === "cl" ? {group:"dfGroup",basis:"dfBasis",weight:"dfSelectedWeight",state:"dfState",rate:"dfRate",rateWrap:"dfRateWrap",weightStatus:"dfWeightStatus",result:"dfResult",mode:"new",root:"dengueNewCaseTemplate"}
    : {group:"dfuGroup",basis:"dfuFluidBasis",weight:"dfuFluidSelectedWeight",state:"dfuFluidState",rate:"dfuFluidRate",rateWrap:"dfuFluidRateWrap",weightStatus:"dfuFluidWeightStatus",result:"dfuFluidResult",mode:"followup",root:"dengueFollowUpTemplate"};
  const adult = p => val(cfg(p).group) === "adult";
  const active = p => adult(p) && (p !== "cl" || val("clDxType") === "Dengue fever");
  const meaningful = s => !/^(?:\s*|no|nil|none|nkmi|n\/a|-|no known medical illness)$/i.test(String(s).trim());
  const checkedValues = selector => Array.from(document.querySelectorAll(selector)).map(x=>x.value);
  function state(p) {
    const f=p === "dfu", c=cfg(p);
    const rawCount = (key,legacy,count) => {
      const n=C.number(val(`${p}${key}Last24`));
      if(n !== null) return n;
      const exact=C.number(val(count));
      if(exact !== null) return exact;
      const old=val(legacy);
      return old === "none" ? 0 : old === "1x" ? 1 : old === "2x" ? 2 : null;
    };
    const rawOral=val(f?"dfuOralIntake":"clDrink");
    const weight=val(`${p}Weight`), height=val(`${p}Height`), sex=val(`${p}Sex`);
    const w=C.weights({weight,height,sex,basis:val(c.basis)});
    const s={weight,height,sex,basis:val(c.basis),weightReason:val(`${p}CpgWeightReason`).trim(),
      phase:val(`${p}Phase`),nearCritical:on(`${p}CpgNearCritical`),haemo:val(`${p}Haemo`),
      fluidState:val(c.state),rate:val(c.rate),oralHourly:val(`${p}CpgOralHourly`),oralPeriod:val(`${p}CpgOralPeriod`) || "1",oralAdequacy:val(`${p}CpgOralAdequacy`),
      oral:["poor","unable"].includes(rawOral)?"unable":rawOral === "reduced"?"reduced":"able",
      dehydrated:val(`${p}Hydration`) === "dehydrated",moderateSevereDehydration:on(`${p}CpgSevereDehydration`),
      vomit:rawCount("Vomit",f?"dfuVomitFrequency":"clVomiting",f?"dfuVomitCount":"clVomitingCount"),
      stool:rawCount("Stool",f?"dfuLooseStoolFrequency":"clDiarrhoea",f?"dfuLooseStoolCount":"clDiarrhoeaCount"),
      abdominalPain:val(f?"dfuAbdominalPain":"clAbdPain") === "yes",intenseAbdominalPain:on(`${p}CpgIntensePain`),
      lethargy:val(`${p}Lethargy`) === "yes",bleeding:f?checkedValues('#dfuBleedingTendencies input:checked').length>0:val("clBleeding") === "yes",
      reducedUrine:f?["reduced","no urine output"].includes(val("dfuUrine")):val("clUrine") === "yes",
      worseDefervescence:on(`${p}CpgWorse`),fluidAccumulation:on(`${p}CpgAccumulation`),postural:on(`${p}CpgPostural`),
      liverGt2:on(`${p}CpgLiver`),lowUrine4h:on(`${p}CpgLowUrine`),rapidHctPlt:on(`${p}CpgLabTrend`),
      labTrend:Boolean(window.dengueRisingHctFallingPlatelet?.(c.mode)),
      manualWarnings: (f?on("dfuCpgWarningConfirmed"):val("clWarningStatus") === "present") && val(`${p}CpgWarningDetail`).trim() ? [val(`${p}CpgWarningDetail`).trim()] : [],
      severeBleeding:on(`${p}CpgSevereBleeding`),leakRespiratory:on(`${p}CpgSevereLeak`),
      severeOrgan:val(`${p}OrganFailure`) === "yes",seizure:val(`${p}Seizure`) === "yes",
      sob:f?val("dfuSob") === "yes":on("clSymSOB"),warningConfirmed:f?on("dfuCpgWarningConfirmed"):val("clWarningStatus") === "present",
      comorbidity:meaningful(val(`${p}DxComorbid`)) || (!f && meaningful(val("clComorbid"))),
      unstableComorbidity:on(`${p}CpgUnstableComorbid`),obese:w.bmi !== null && w.bmi !== undefined && w.bmi >27.5,
      age:val(`${p}Age`),pregnant:val(`${p}Pregnancy`) === "yes",bloodThinner:val(`${p}BloodThinner`) === "yes",social:val(`${p}SocialLimit`) === "yes",
      sglt2:on(`${p}CpgSglt2`),metformin:on(`${p}CpgMetformin`),statin:on(`${p}CpgStatin`),nsaid:on(`${p}CpgNsaid`),steroid:on(`${p}CpgSteroid`),derangedLiver:on(`${p}CpgDerangedLiver`)};
    if(s.moderateSevereDehydration) s.dehydrated=true;
    return s;
  }
  function referral(p) {
    const a=C.assess(state(p));
    return {...a,enabled:true,urgentReasons:a.urgent,haemodynamic:{category:"clinician",detail:"Haemodynamic status is clinician assessed."}};
  }
  function warningData(p) {
    const a=C.assess(state(p));
    return {positive:a.warningSigns,negative:[],belowThreshold:a.concerns};
  }
  function frequencyLine(p,type) {
    const s=state(p), count=type === "vomiting"?s.vomit:s.stool;
    const label=type === "vomiting"?"Vomiting":"Loose stool";
    if(count === null) return `${label}: not recorded.`;
    if(count<0 || !Number.isInteger(count)) return `${label}: check the episode count.`;
    return `${label}: ${count} times/24 h.`;
  }
  function diagnosis(p) {
    const s=state(p), a=C.assess(s), f=p === "dfu";
    const day=val(f?"dfuDayIllness":"clDxDay");
    const reviewed=on(`${p}CpgDxReviewed`), certainty=val(`${p}CpgDxCertainty`);
    const detail=val(`${p}DxComorbid`) || (!f?val("clComorbid"):"");
    const comorbid=s.comorbidity?`underlying ${detail}`:"NKMI";
    const special=[s.pregnant?"pregnant":"",Number(s.age)>65?`age ${s.age} years`:"",s.obese?"obesity":""].filter(Boolean);
    const severeDetails=[s.severeBleeding?"severe bleeding":"",s.leakRespiratory?"severe plasma leakage with respiratory distress":"",s.severeOrgan?`severe organ involvement${val(`${p}OrganFailureDetails`).trim()?`: ${val(`${p}OrganFailureDetails`).trim()}`:""}`:""].filter(Boolean);
    const severity=a.group === "C"?`severe dengue${severeDetails.length?` (${severeDetails.join("; ")})`:""}`:a.warningSigns.length?`dengue with warning signs (${a.warningSigns.join(", ")})`:"dengue without warning signs";
    const phase=s.nearCritical && s.phase !== "critical phase"?`${s.phase}, approaching critical phase (clinician assessed)`:s.phase;
    const haemodynamics=s.haemo === "haemodynamically stable"?"not in shock":s.haemo;
    const complete=reviewed && ["suspected","confirmed"].includes(certainty) && Number.isInteger(C.number(day)) && Number(day)>0
      && (certainty!=="confirmed" || val(`${p}CpgDxEvidence`).trim())
      && (val(`${p}DxComorbidStatus`)!=="present" || s.comorbidity)
      && (!s.severeOrgan || val(`${p}OrganFailureDetails`).trim());
    const text=complete?`${certainty === "confirmed"?"Confirmed":"Suspected"} ${severity}, D${Number(day)}, ${phase}, ${haemodynamics}, ${[comorbid,...special].join(", ")}.`:"Complete the diagnosis details and clinical review above.";
    setValue(`${p}GeneratedDx`,text);
    if(f){setValue("dfuDxDay",val("dfuDayIllness"));setValue("dfuWarningStatusDisplay",a.warningSigns.length?`Present — ${a.warningSigns.join(", ")}`:reviewed?"No warning signs":"Clinical review pending");}
    return text;
  }
  function syncWeight(p) {
    const c=cfg(p), s=state(p), w=C.weights(s);
    if(el(c.basis)) el(c.basis).disabled=false;
    setValue(c.weight,w.valid?C.round(w.selected):"");
    setText(c.weightStatus,w.valid?`Using ${C.round(w.selected)} kg ${w.label}${w.manual?" — clinician override":" (CPG automatic)"}. Maintenance/quota use a maximum of 70 kg; shock resuscitation uses the selected actual/adjusted weight.`:w.error);
    return w;
  }
  function rates(p) {
    const c=cfg(p), category=val(c.state), select=el(c.rate);
    if(!select) return;
    const old=select.value;
    const options=category === "warning"?[["3","3 mL/kg/hour"],["4","4 mL/kg/hour"],["5","5 mL/kg/hour"]]
      : category === "compensated"?[["10","10 mL/kg over 1 hour"]]
      : category === "decompensated"?[["20","20 mL/kg over 15–30 minutes"]]:[];
    select.replaceChildren(...options.map(([value,text])=>{const option=document.createElement("option");option.value=value;option.textContent=text;return option;}));
    if(options.some(x=>x[0]===old)) select.value=old;
    el(c.rateWrap)?.classList.toggle("hidden",!options.length);
  }
  function syncCategory(p) {
    const c=cfg(p), select=el(c.state);if(!select)return;
    const restrict=(option, disabled)=>{
      if(option.disabled!==disabled)option.disabled=disabled;
      if(option.hidden!==disabled)option.hidden=disabled;
    };
    if(!adult(p)) {
      for(const option of select.options)restrict(option,option.value==="febrile");
      return;
    }
    const s=state(p), choices=C.fluidCategories(s);
    for(const option of select.options)restrict(option,!choices.allowed.includes(option.value));
    if(!choices.allowed.includes(select.value)) {
      setValue(c.state,choices.preferred);setValue(`${p}CpgOralAdequacy`,"");rates(p);
    }
  }
  function fluid(p){
    syncCategory(p);
    const s=state(p), r=C.fluid(s);
    if(!r.valid || r.canPrescribe === false || s.fluidState === "no-warning")return r;
    const reassessment=s.fluidState === "warning"?"Reassess after 1 hour.":s.fluidState === "febrile"?"Reassess hydration; reduce/stop IV as oral intake improves.":"Reassess CCTVR, BP, HCT & UO.";
    const prescription=r.headline.replace(/^(?:IV )?isotonic crystalloid\b/i,"IV NS");
    return {...r,plan:`${prescription}.`,reassessment};
  }
  function calculate(p){refresh(p);if(active(p) && el(cfg(p).result)){el(cfg(p).result).dataset.cpgCalculated="true";renderFluidResult(p);}}
  function oralAdvice(p) {
    if(on(`${p}CpgFluidRestricted`)) return `Oral fluids: ${val(`${p}CpgFluidRegimen`).trim() || "[ENTER REGIMEN]"}.`;
    return "Oral fluids ~200 mL/hour while awake; include ORS / electrolyte fluids, not plain water alone.";
  }
  function dischargeState() {
    return {afebrileConfirmed:on("dfuCpgAfebrile"),improving:on("dfuCpgImproving"),stable:on("dfuCpgStable"),intakeUrine:on("dfuCpgIntakeUrine"),noBleedingResp:on("dfuCpgNoBleedingResp"),labsReviewed:on("dfuCpgLabsReviewed"),stopFbcConfirmed:on("dfuCpgStopFbcConfirmed")};
  }
  function adjustPlan(p,option,input) {
    if(!active(p)) return input;
    const s=state(p), a=C.assess(s), lines=input.map(line=>{
      if(/Encourage oral fluid intake (?:approximately )?2 L\/day/.test(line)) return oralAdvice(p);
      if(/^(?:Repeat \/ continue|Continue) serial FBC monitoring\./.test(line)) {
        const date=p === "dfu" && on("dfuPlanSubMonTca")?val("dfuNextTca"):"";
        return date?`Repeat FBC on ${date.split("-").reverse().join("/")}.`:"Repeat FBC CM.";
      }
      if(/^TCA STAT if warning signs/.test(line)) return "TCA STAT if warning signs / worsening symptoms.";
      if(line === "Off FBC monitoring.") return C.dischargeReady(dischargeState())?"Off FBC monitoring.":"Review recovery before stopping FBC.";
      if(/^TCA back if fever persists for 3 days for FBC\./.test(line)) return "Review and repeat FBC CM.";
      if(/^TCA on .* for clinical review and repeat FBC\.$/.test(line)) return line.replace(" for clinical review and repeat FBC", "");
      if(line === "Arrange TCA for clinical review and repeat FBC.") return "TCA CM.";
      if(line === "Refer ED for further assessment and management.") return "Refer ED.";
      if(line === "Notify dengue case via e-notification.") return "Notify dengue.";
      if(line === "Dengue pamphlet / education and safety-net advice given.") return "Dengue advice / pamphlet given.";
      if(line === "Advise to monitor and eliminate stagnant water collections that may become Aedes breeding sites.") return "Eliminate Aedes breeding sites.";
      return line;
    });
    if(["outpatient","monitoring"].includes(option)) lines.push("Daily clinical review. Monitor intake and urine output.");
    if(option === "refer") lines.push("Inform receiving hospital; send notes, results & fluid chart.");
    lines.push(...C.medicationAdvice(s).map(line=>line.replace(/ \(CPG[^)]*\)\./g,".")));
    const override=val(`${p}CpgDispositionReason`).trim();
    if(override) lines.push(`Disposition rationale: ${override}`);
    else if(a.needsHospital && option !== "refer") lines.push("Review disposition: hospital assessment indicated.");
    return [...new Set(lines)];
  }
  function dateToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function vaccineAdvice(p) {
    if(val(`${p}CpgVaccine`) !== "yes") return "";
    const date=val(`${p}CpgVaccineDate`), encounter=val(`${p}VitalDateTime`).slice(0,10) || dateToday();
    const days=C.vaccineDays(date,encounter);
    if(days === null) return "Record vaccination date. Recent vaccination can affect dengue test interpretation (CPG p21).";
    if(days < 0) return "Vaccination date is after the encounter date — check both dates.";
    return days <=30 ? `Vaccinated ${days} day(s) before assessment. Within 30 days: prefer RT-qPCR (serum within 5 days of symptom onset); consider NS1 if unavailable. IgM/IgG are not standalone confirmatory tests. PCR/NS1 positivity may reflect vaccine-derived virus; interpret clinically (CPG p21).`
      : "Vaccination was more than 30 days before this assessment; interpret tests with illness day and clinical context.";
  }
  function recordLines(p) {
    if(!active(p)) return [];
    const lines=[], status=val(`${p}CpgVaccine`);
    if(val(`${p}CpgDxCertainty`) === "confirmed" && val(`${p}CpgDxEvidence`).trim()) lines.push(`Dengue confirmation: ${val(`${p}CpgDxEvidence`).trim()}.`);
    const fluidState=state(p);
    if(needsOralAdequacy(fluidState) && ["adequate","inadequate"].includes(fluidState.oralAdequacy)) lines.push(`Oral fluid intake assessed as ${fluidState.oralAdequacy} for current needs; oral tolerance preserved.`);
    if(status) lines.push(`Dengue vaccination: ${status}${status === "yes"?`; date ${val(`${p}CpgVaccineDate`) || "not recorded"}`:""}.`);
    const advice=vaccineAdvice(p); if(advice) lines.push(advice);
    if(val(`${p}CpgSteroidIndication`).trim()) lines.push(`Context / separate indication for recorded NSAID or corticosteroid administration: ${val(`${p}CpgSteroidIndication`).trim()}`);
    const frequency=val(`${p}CpgVoids`), urine=val(`${p}CpgUrineMl`), hours=val(`${p}CpgUrineHours`);
    if(frequency !== "") lines.push(`Urination frequency: ${frequency} times/24 h.`);
    if(urine !== "" && hours !== "") {
      const weight=C.number(val(`${p}Weight`)), u=C.number(urine), h=C.number(hours);
      if(weight>0 && u>=0 && h>0) lines.push(`Measured urine: ${u} mL over ${h} h; ${(u/(weight*h)).toFixed(2)} mL/kg/hour using actual weight ${weight} kg.`);
    }
    const oral=C.number(val(`${p}CpgOralTotal`)), iv=C.number(val(`${p}CpgIvTotal`));
    if(oral !== null || iv !== null) lines.push(`Fluid chart since critical-phase onset ${val(`${p}CpgCriticalStart`) || "[RECORD TIME]"}: oral ${oral === null?"not recorded":oral+" mL"}; IV ${iv === null?"not recorded":iv+" mL"}${oral !== null && iv !== null?`; combined ${oral+iv} mL`:""}.`);
    if(val(`${p}CpgWeightReason`).trim()) lines.push(`Fluid weight basis rationale: ${val(`${p}CpgWeightReason`).trim()}`);
    return lines;
  }
  function validate(p) {
    if(!active(p)) return true;
    const s=state(p), a=C.assess(s), errors=[], option=val(`${p}PlanOption`);
    const day=C.number(val(p === "cl"?"clDxDay":"dfuDayIllness"));
    if(!Number.isInteger(day) || day<1) errors.push("Enter a positive whole-number day of illness.");
    if(!["suspected","confirmed"].includes(val(`${p}CpgDxCertainty`))) errors.push("Select suspected or confirmed dengue.");
    if(val(`${p}CpgDxCertainty`) === "confirmed" && !val(`${p}CpgDxEvidence`).trim()) errors.push("Record the laboratory evidence supporting confirmed dengue (including a prior result for follow-up).");
    if(!on(`${p}CpgDxReviewed`)) errors.push("Review the clinical findings, phase, warning signs, perfusion and comorbidities; then confirm diagnosis review.");
    if(val(`${p}DxComorbidStatus`) === "present" && !s.comorbidity) errors.push("Enter the recorded comorbidity or select No comorbid after assessment.");
    if(s.severeOrgan && !val(`${p}OrganFailureDetails`).trim()) errors.push("Document the severe organ involvement.");
    if(s.warningConfirmed && a.warningSigns.length === 1 && a.warningSigns[0] === "warning signs confirmed by clinician") errors.push("Select the specific warning finding or document it under Additional warning sign / clinical rationale.");
    if(a.needsHospital && option !== "refer" && !val(`${p}CpgDispositionReason`).trim()) errors.push("Select ED referral or document the clinician's disposition rationale for the findings requiring hospital assessment.");
    if(on(`${p}CpgFluidRestricted`) && !val(`${p}CpgFluidRegimen`).trim()) errors.push("Document the individualised fluid regimen.");
    if(option === "discharge" && !C.dischargeReady(dischargeState())) errors.push("Complete the recovery review and explicit clinician decision before stopping routine FBC monitoring.");
    if(option === "discharge" && (a.needsHospital || s.haemo !== "haemodynamically stable")) errors.push("Resolve the recorded acute findings requiring hospital assessment before selecting routine discharge / stopping FBC.");
    const fluidResult=fluid(p);
    if(option === "refer" && on(p === "cl"?"clPlanSubReferFluid":"dfuPlanSubReferFluid") && (!fluidResult.valid || fluidResult.canPrescribe === false)) errors.push("Resolve the fluid calculation, or untick Start IV fluid if no IV prescription is intended.");
    if(on(`${p}IntVoltaren`) && !val(`${p}CpgSteroidIndication`).trim()) errors.push("IM diclofenac is inappropriate as dengue treatment. If already administered, record the prior-exposure context; this must not be interpreted as a dengue treatment recommendation.");
    if(on(`${p}IntHydro`) && !val(`${p}CpgSteroidIndication`).trim()) errors.push("Document the separate indication for hydrocortisone; corticosteroids are not dengue treatment.");
    for(const key of ["VomitLast24","StoolLast24","CpgVoids"]) {
      const n=C.number(val(p+key)); if(n !== null && (n<0 || !Number.isInteger(n))) errors.push("Episode / void counts must be non-negative whole numbers.");
    }
    for(const key of ["CpgOralHourly","CpgOralTotal","CpgIvTotal","CpgUrineMl"]) {
      const n=C.number(val(p+key)); if(n !== null && n<0) errors.push("Fluid and urine volumes must not be negative.");
    }
    const urine=val(`${p}CpgUrineMl`), hours=val(`${p}CpgUrineHours`);
    if((urine !== "" || hours !== "") && !(C.number(urine)>=0 && urine !== "" && C.number(hours)>0 && C.number(s.weight)>0)) errors.push("Measured urine needs a non-negative volume, a positive time interval and actual body weight.");
    const target=val(`${p}CpgQuotaTarget`);
    if(target !== "" && !(C.number(target)>0)) errors.push("The clinician-agreed quota target must be positive.");
    const start=val(`${p}CpgCriticalStart`), encounter=val(`${p}VitalDateTime`);
    if(start && encounter && Date.parse(start)>Date.parse(encounter)) errors.push("Critical-phase onset cannot be after the assessment time.");
    const status=el(`${p}CpgValidation`);
    if(status){status.textContent=errors.join(" ");status.classList.toggle("hidden",!errors.length);if(errors.length) status.scrollIntoView?.({behavior:"smooth",block:"center"});}
    return errors.length === 0;
  }
  const resetting = new Set();
  function needsOralAdequacy(s) {
    return ["febrile","warning"].includes(s.fluidState) && s.oral === "able" && !s.dehydrated;
  }
  function invalidateOralAdequacy(p, id) {
    const c=cfg(p);
    if([c.group,c.state,p === "cl" ? "clDrink" : "dfuOralIntake",`${p}Hydration`,`${p}CpgSevereDehydration`,`${p}Phase`,`${p}CpgNearCritical`,`${p}Weight`,`${p}Height`,`${p}Sex`,`${p}CpgOralHourly`,`${p}CpgOralPeriod`].includes(id)) setValue(`${p}CpgOralAdequacy`,"");
  }
  function clearFluidResult(p, message="Select a category, then calculate.") {
    const c=cfg(p), box=el(c.result);
    if(box){box.dataset.cpgCalculated="false";setText(c.result,message);}
  }
  function renderFluidResult(p) {
    const c=cfg(p), box=el(c.result);if(!box)return;
    const r=fluid(p);
    const signature=JSON.stringify(r);
    // Avoid rebuilding disclosure controls when an unrelated field changes.
    if(box.dataset.cpgSignature===signature && box.querySelector(".fluid-headline"))return;
    box.dataset.cpgSignature=signature;
    const title=document.createElement("strong");title.className="fluid-headline";title.textContent=r.headline || r.display;
    const nodes=[title];
    if(r.action){const action=document.createElement("p");action.className="fluid-action";action.textContent=r.action;nodes.push(action);}
    if(r.valid){
      const detail=document.createElement("details"), summary=document.createElement("summary"), text=document.createElement("div");
      summary.textContent="Calculation details & CPG source";text.className="fluid-detail";text.textContent=r.display;
      detail.append(summary,text);nodes.push(detail);
    }
    box.replaceChildren(...nodes);
  }
  function syncFluidDisplay(p) {
    const c=cfg(p), isAdult=adult(p), category=val(c.state);
    el(`${p}CpgOralHourlyWrap`)?.classList.toggle("hidden",!isAdult || category!=="febrile");
    el(`${p}CpgOralAdequacyWrap`)?.classList.toggle("hidden",!active(p) || !needsOralAdequacy(state(p)));
    const quota=el(`${p}CpgQuotaDetails`);
    if(quota)quota.classList.toggle("hidden",!active(p));
    // One fixed adult shock rate does not need a second dropdown; paediatric choices remain visible.
    if(isAdult)el(c.rateWrap)?.classList.toggle("hidden",category!=="warning");
    if(isAdult){
      const s=state(p), w=C.weights(s), capped=["febrile","warning"].includes(category), calculationWeight=capped?w.maintenanceWeight:w.selected;
      setText(`${p}FluidWeightSummary`,w.valid?`Calculation weight: ${C.round(calculationWeight)} kg${capped && w.selected>70?` (70 kg maintenance cap; selected ${C.round(w.selected)} kg ${w.label})`:` · ${w.label}${w.manual?" (override)":" (automatic)"}`}`:"Complete weight and height above, or review the weight override.");
      setText(`${p}FluidAssessmentSummary`,`${s.phase}${s.nearCritical && s.phase!=="critical phase"?" (approaching critical)":""} · ${C.assess(s).warningSigns.length?"warning signs recorded":"no warning signs recorded"} · ${s.haemo}.`);
      const oral=C.oralRate(s.oralHourly,s.oralPeriod);
      setText(`${p}CpgOralUnitHint`,oral===null?"Enter 0 if none. Select the unit explicitly.":Number(s.oralPeriod)===24?`Average: ${C.round(oral)} mL/hour. Confirm the 24-hour average reflects current intake.`:`${C.round(oral)} mL each hour. If this is a daily total, select mL/24 hours.`);
    }
    else{const w=C.number(val(`${p}Weight`));setText(`${p}FluidWeightSummary`,w>0?`Calculation weight: ${w} kg · actual body weight`:"Enter weight above.");}
  }
  function resetStart(p) {resetting.add(p);}
  function resetEnd(p) {
    resetting.delete(p);setValue(`${p}CpgOralAdequacy`,"");setValue(`${p}CpgOralPeriod`,"1");clearFluidResult(p);
    if(el(`${p}CpgDxReviewed`))el(`${p}CpgDxReviewed`).checked=false;
    setValue(`${p}CpgDxCertainty`,"");setValue(`${p}CpgDxEvidence`,"");
    for(const id of [`${p}FluidWeightDetails`,`${p}CpgQuotaDetails`])if(el(id))el(id).open=false;
    setText(`${p}CpgValidation`,"");el(`${p}CpgValidation`)?.classList.add("hidden");
    if(adult(p))rates(p);refresh(p);
  }
  function refresh(p) {
    if(resetting.has(p))return;
    const isAdult=adult(p), isActive=active(p), c=cfg(p), root=el(c.root);
    if(!root) return;
    root.dataset.cpgAdult=String(isAdult);
    root.querySelectorAll(".adult-cpg4").forEach(x=>x.classList.toggle("hidden",!isActive));
    const phaseWrap=el(`${p}Phase`)?.parentElement;
    // The same phase field serves adults and children; place it back for the paediatric form.
    const phaseHome=el(`${p}CpgPhaseHome`),phaseSlot=el(`${p}CpgPhaseSlot`);
    if(phaseWrap && phaseHome && phaseSlot){const target=isActive?phaseSlot:phaseHome;if(phaseWrap.parentElement!==target)target.appendChild(phaseWrap);}
    if(p === "cl"){
      const status=el("clWarningStatus")?.parentElement,slot=el("clCpgOverrideSlot"),home=el("clCpgPhaseHome");
      if(status && slot && home){const target=isActive?slot:home;if(status.parentElement!==target)target.appendChild(status);}
    }
    if(!isAdult && val(c.state) === "febrile") setValue(c.state,"no-warning");
    const cpgBasis=el(c.basis)?.querySelector('option[value="cpg"]');if(cpgBasis){cpgBasis.disabled=!isAdult;cpgBasis.hidden=!isAdult;}
    const warnOption=el(c.state)?.querySelector('option[value="warning"]'),warnLabel=isAdult?"Critical phase with warning signs (B2)":"With warning signs / unable oral intake";if(warnOption && warnOption.textContent!==warnLabel)warnOption.textContent=warnLabel;
    const oralOption=el(c.state)?.querySelector('option[value="no-warning"]'),oralLabel=isAdult?"Oral hydration / reassessment":"Stable, no warning signs";if(oralOption && oralOption.textContent!==oralLabel)oralOption.textContent=oralLabel;
    syncCategory(p);
    root.querySelectorAll(".dengue-frequency-shell").forEach(shell=>{
      const hint=shell.querySelector(".dengue-frequency-threshold");if(!hint)return;
      hint.textContent=!isAdult?"≥3 episodes in 24 hours is classified as a dengue warning sign.":shell.id.includes("Vomit")?"Adult CPG4: persistent vomiting >3 episodes/24 h; interpret near/in critical phase with the full clinical assessment.":"Loose stool: assess dehydration and oral tolerance; not a standalone adult dengue warning sign.";
    });
    const fluidLabel=el(p === "cl"?"clPlanSubOutFluid":"dfuPlanSubMonFluid")?.parentElement?.querySelector("span");
    if(fluidLabel) fluidLabel.textContent=isAdult?"Oral fluids 200 mL/hour while awake / individualised restriction":"Encourage adequate oral fluids according to age, weight and clinical tolerance";
    syncFluidDisplay(p);
    if(!isActive) return;
    const s=state(p), a=C.assess(s);
    setText(`${p}CpgHistoryVomiting`,s.vomit === null ? "History: count not recorded" : !Number.isInteger(s.vomit) || s.vomit < 0 ? "History: check the episode count" : `History: ${s.vomit} times/24 h${s.vomit > 3 ? " — meets >3 criterion" : " — does not meet >3 criterion"}`);
    setText(`${p}CpgHistoryMental`,s.lethargy ? "History: present" : "History: No — confirm on review");
    setText(`${p}CpgHistoryBleeding`,s.bleeding ? "History: bleeding recorded" : "History: no bleeding selected — confirm on review");
    const pendingFindings=a.recordedWarningFindings || [];
    const warningSummary=a.warningSigns.length ? `Warning signs present: ${a.warningSigns.join("; ")}.`
      : pendingFindings.length ? `Findings recorded: ${pendingFindings.join("; ")}. Current phase: ${s.phase}. Review phase, perfusion, HCT trend and urine output before classifying these as warning signs.`
      : a.concerns.length ? "No warning-sign criteria recorded. Other symptoms / hydration concerns still need review before completing the diagnosis."
      : on(`${p}CpgDxReviewed`) ? "No warning signs on the reviewed assessment." : "Review pending. Confirm the symptoms above and all 10 findings before completing the diagnosis.";
    setText(`${p}CpgWarningSummary`,a.group === "C" ? `Severe dengue: ${a.urgent.join("; ")}. Urgent hospital referral.${a.warningSigns.length ? " " + warningSummary : ""}` : warningSummary);
    el(`${p}CpgDxEvidenceWrap`)?.classList.toggle("hidden",val(`${p}CpgDxCertainty`)!=="confirmed");
    el(`${p}CpgWarningDetail`)?.closest(".cpg-warning-detail")?.classList.toggle("hidden",!s.warningConfirmed);
    const mental=el(`${p}Lethargy`)?.parentElement?.querySelector("label");
    if(mental)mental.textContent="Lethargy / restlessness / irritability / confusion";
    setText(`${p}CpgAssessment`,`${a.title}. ${a.summary}${a.concerns.length?" Reassessment: "+a.concerns.join("; "):""}`);
    setText(`${p}CpgVaccineAdvice`,vaccineAdvice(p));
    const advice=C.medicationAdvice(s);setText(`${p}CpgMedicationAdvice`,advice.join("\n") || "Review current medicines. Use paracetamol cautiously at the lowest effective dose and shortest duration; avoid/discontinue if liver enzymes are deranged (p34).");
    el(`${p}CpgVaccineDate`)?.closest(".cpg-vaccine-date")?.classList.toggle("hidden",val(`${p}CpgVaccine`) !== "yes");
    el(`${p}CpgFluidRegimen`)?.closest(".cpg-fluid-regimen")?.classList.toggle("hidden",!on(`${p}CpgFluidRestricted`));
    el(`${p}CpgWeightReason`)?.closest(".cpg-weight-reason")?.classList.toggle("hidden",val(c.basis) === "cpg");
    if(p === "dfu") el("dfuCpgDischarge")?.classList.toggle("hidden",val("dfuPlanOption") !== "discharge");
    const w=syncWeight(p), q=w.valid?C.quota(w.selected):null;
    let qText="Enter valid body measurements for maintenance and quota estimates.";
    const inShock=["compensated shock","decompensated shock"].includes(s.haemo) || ["compensated","decompensated"].includes(s.fluidState);
    if(inShock) qText="Shock: the non-shock fluid quota does not apply. Use shock resuscitation and reassess urgently.";
    else if(q) {
      qText=`Maintenance (oral + IV): ${C.round(q.hourly)} mL/hour. Critical phase WITHOUT shock only: formula estimate ${q.formula} mL over 48 hours (one-day maintenance + 50 mL/kg; calculation weight ${C.round(q.weight)} kg, maximum 70 kg).`;
      if(q.table !== null) qText+=` CPG Table/Algorithm 1 quota: ${q.table} mL.`;
      if(q.differs) qText+=" The printed table differs from the exact formula: confirm the prescribed target; neither value is silently selected.";
      qText+=" Include oral and IV intake. Not all patients need the full quota. B2 requires admission; this is a calculation/transfer record, not an outpatient 48-hour infusion order.";
      const oral=C.number(val(`${p}CpgOralTotal`)), iv=C.number(val(`${p}CpgIvTotal`)), target=C.number(val(`${p}CpgQuotaTarget`));
      const start=val(`${p}CpgCriticalStart`), encounter=val(`${p}VitalDateTime`);
      const elapsed=start && encounter?(Date.parse(encounter)-Date.parse(start))/3600000:null;
      if(elapsed !== null && elapsed<0) qText+=" Check critical-phase onset: it is after the assessment time.";
      else if(elapsed !== null && elapsed>=48) qText+=" Recorded critical-phase interval is ≥48 hours: reassess phase; do not carry forward this quota automatically.";
      else if(oral !== null && oral>=0 && iv !== null && iv>=0) {
        qText+=` Recorded oral + IV: ${oral+iv} mL.`;
        if(target>0) qText+=` Difference from clinician-agreed target: ${C.round(target-oral-iv)} mL${target<oral+iv?" — target exceeded; reassess now":" (not an instruction to infuse the balance)"}.`;
      }
    }
    setText(`${p}CpgQuotaDisplay`,qText);
    const urine=C.number(val(`${p}CpgUrineMl`)), hours=C.number(val(`${p}CpgUrineHours`)), weight=C.number(s.weight);
    setText(`${p}CpgUrineDisplay`,urine !== null && urine>=0 && hours>0 && weight>0?`Measured urine output ${(urine/(weight*hours)).toFixed(2)} mL/kg/hour (actual weight). Outpatient guide: at least 0.5 mL/kg/hour; usually 4–6 voids/day and at least once every 6 hours. Reassess any reduction.`:"Record frequency; add measured volume and interval if available. Do not infer adequate urine output from a blank field.");
    diagnosis(p);
    if(p === "dfu") window.renderDengueFollowUpWarningClassification?.();
    else window.renderNewCaseFrequencyClassification?.();
    window.renderDengueReferralAlert?.(c.mode,{silent:true});
    if(p === "cl") window.renderDenguePlanPreview?.(); else window.renderDengueFollowUpPlan?.();
    // Keep a calculated result current when inputs change, rather than retaining a stale dose.
    if(el(c.result)?.dataset.cpgCalculated === "true") renderFluidResult(p);
  }
  function init() {
    for(const p of ["cl","dfu"]) {
      const c=cfg(p), root=el(c.root); if(!root)continue;
      const phase=el(`${p}Phase`)?.parentElement;
      if(phase){
        const slot=document.createElement("div");slot.id=`${p}CpgPhaseSlot`;phase.before(slot);slot.appendChild(phase);
        const home=document.createElement("div");home.id=`${p}CpgPhaseHome`;
        (el(p === "cl"?"clDxDay":"dfuDxDay")?.parentElement)?.after(home);
      }
      if(p === "cl"){
        const status=el("clWarningStatus")?.parentElement;
        if(status){const slot=document.createElement("div");slot.id="clCpgOverrideSlot";status.before(slot);slot.appendChild(status);}
      }
      root.addEventListener("change",event=>{
        if(!active(p))return;
        const pairs=[[`${p}CpgIntensePain`,p === "cl"?"clAbdPain":"dfuAbdominalPain","yes"],[`${p}CpgLowUrine`,p === "cl"?"clUrine":"dfuUrine",p === "cl"?"yes":"reduced"]];
        for(const [check,field,yes] of pairs){
          if(event.target.id === check && on(check) && ["no","normal"].includes(val(field))){setValue(field,yes);el(field)?.dispatchEvent(new Event("change",{bubbles:true}));}
          if(event.target.id === field && ["no","normal"].includes(val(field)) && el(check))el(check).checked=false;
        }
      },true);
      root.addEventListener("input",event=>{
        if(event.target.matches("textarea[id$='Output'],textarea[id$='GeneratedDx']"))return;
        invalidateDiagnosisReview(p,event.target);
        invalidateOralAdequacy(p,event.target.id);
        if(!active(p))clearFluidResult(p,"Inputs changed — calculate again.");
        refresh(p);
      });
      root.addEventListener("change",event=>{
        invalidateDiagnosisReview(p,event.target);
        invalidateOralAdequacy(p,event.target.id);
        if(event.target.id === c.group || !active(p))clearFluidResult(p,"Inputs changed — calculate again.");
        if(event.target.id === c.group && adult(p)) setValue(c.basis,"cpg");
        if(adult(p) && [c.state,c.group].includes(event.target.id)) rates(p);
        refresh(p);
      });
      root.querySelectorAll("[data-cpg-history]").forEach(button=>button.addEventListener("click",()=>{
        const target=el(button.dataset.cpgHistory);if(!target)return;
        for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent.tagName==="DETAILS")parent.open=true;
        const field=target.matches("input,select,textarea")?target:target.querySelector("input,select,textarea");
        target.scrollIntoView({block:"center"});field?.focus({preventScroll:true});
      }));
      el(`${p}FluidReviewAssessment`)?.addEventListener("click",()=>{
        const field=el(`${p}Phase`);if(!field)return;
        for(let parent=field.parentElement;parent;parent=parent.parentElement)if(parent.tagName==="DETAILS")parent.open=true;
        field.scrollIntoView?.({behavior:"smooth",block:"center"});field.focus({preventScroll:true});
      });
      el(`${p}Reset`)?.addEventListener("click",()=>resetStart(p),true);
      el(`${p}Reset`)?.addEventListener("click",()=>resetEnd(p));
      if(adult(p)){rates(p);refresh(p);}
    }
  }
  function invalidateDiagnosisReview(p,target) {
    const id=target?.id || "";
    // Plan, contact details and copied notes do not change the clinical assessment.
    const clinical=/^(?:Age|Sex|Weight|Height|Phase|Haemo|Dx|DayIllness|Comorbid|Pregnancy|BloodThinner|Social|Drink|OralIntake|Urine|Hydration|Vomit|Vomiting|Stool|Diarrhoea|Abd|Lethargy|Seizure|Organ|Bleeding|Warning|Sob|SymSOB|General|GCS|Vital|QuickFbc|Combo|PA|CVS|Lungs|OtherSymptoms|OtherPhysical|Cpg)/;
    if([`${p}CpgDxReviewed`,`${p}CpgDispositionReason`].includes(id))return;
    if((id.startsWith(p) && clinical.test(id.slice(p.length))) || target?.closest?.(`#${p}BleedingTendencies`) || id === cfg(p).group){
      if(el(`${p}CpgDxReviewed`))el(`${p}CpgDxReviewed`).checked=false;
    }
  }
  window.MedAssistDengueCpg4UI={state,active,referral,warningData,frequencyLine,diagnosis,syncWeight,rates,syncCategory,fluid,calculate,oralAdvice,adjustPlan,recordLines,validate,refresh,renderFluidResult,syncFluidDisplay,clearFluidResult,resetStart,resetEnd};
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
