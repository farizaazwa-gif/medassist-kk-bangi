(function () {
  "use strict";
  if (typeof document === "undefined") return;
  const C = window.MedAssistDengueCpg4;
  const el = id => document.getElementById(id);
  const val = id => el(id)?.value ?? "";
  const on = id => Boolean(el(id)?.checked);
  const setText = (id,text) => { if(el(id)) el(id).textContent=text; };
  const setValue = (id,text) => { if(el(id)) el(id).value=text; };
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
      fluidState:val(c.state),rate:val(c.rate),oralHourly:val(`${p}CpgOralHourly`),
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
  function diagnosis(p) {
    const s=state(p), a=C.assess(s), f=p === "dfu";
    const day=val(f?"dfuDayIllness":"clDxDay") || "[ENTER]";
    const warning=a.warningSigns.length?`with warning signs (${a.warningSigns.join(", ")})`:"without classified warning signs on current assessment";
    const detail=val(`${p}DxComorbid`) || (!f?val("clComorbid"):"");
    const comorbid=s.comorbidity?`with comorbid ${detail || "[ENTER COMORBID]"}`:"no comorbid documented";
    const severity=a.group === "C"?"Severe dengue":"Dengue fever";
    const phase=s.nearCritical && s.phase !== "critical phase"?`${s.phase}, approaching critical phase (clinician assessed)`:s.phase;
    const text=`${severity}, day ${day} of illness, in ${phase}, ${warning}, ${s.haemo}, ${comorbid}`;
    setValue(`${p}GeneratedDx`,text);
    if(f){setValue("dfuDxDay",val("dfuDayIllness"));setValue("dfuWarningStatusDisplay",a.warningSigns.length?`Present — ${a.warningSigns.join(", ")}`:"No classified warning signs — reassess clinically");}
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
  function fluid(p){return C.fluid(state(p));}
  function oralAdvice(p) {
    if(on(`${p}CpgFluidRestricted`)) return `Use the individualised oral fluid restriction regimen: ${val(`${p}CpgFluidRegimen`).trim() || "[DOCUMENT PRESCRIBED REGIMEN]"}. Monitor hydration and urine output.`;
    return "Oral fluids approximately 200 mL/hour while awake, including electrolyte-containing fluids (e.g. ORS or soup); avoid plain water alone. Individualise if fluid restriction is required.";
  }
  function dischargeState() {
    return {afebrileConfirmed:on("dfuCpgAfebrile"),improving:on("dfuCpgImproving"),stable:on("dfuCpgStable"),intakeUrine:on("dfuCpgIntakeUrine"),noBleedingResp:on("dfuCpgNoBleedingResp"),labsReviewed:on("dfuCpgLabsReviewed"),stopFbcConfirmed:on("dfuCpgStopFbcConfirmed")};
  }
  function adjustPlan(p,option,input) {
    if(!active(p)) return input;
    const s=state(p), a=C.assess(s), lines=input.map(line=>{
      if(/Encourage oral fluid intake (?:approximately )?2 L\/day/.test(line)) return oralAdvice(p);
      if(/^(?:Repeat \/ continue|Continue) serial FBC monitoring\./.test(line)) return "Arrange daily clinical review and serial FBC as clinically indicated. Continue outpatient follow-up until afebrile 24–48 hours without antipyretics, with reassessment of clinical recovery.";
      if(/^TCA STAT if warning signs/.test(line)) return "Return immediately for worsening symptoms, severe abdominal pain, persistent vomiting, bleeding, drowsiness/restlessness, breathing difficulty or reduced/absent urine. Fever settling does not by itself indicate recovery.";
      if(line === "Off FBC monitoring.") return C.dischargeReady(dischargeState())?"Clinician reviewed recovery and laboratory trends and decided to stop routine FBC monitoring; return immediately if symptoms recur/worsen.":"Discharge / stopping FBC not confirmed — complete recovery review and clinician decision.";
      if(/^TCA back if fever persists for 3 days for FBC\./.test(line)) return "Dengue requires daily review and appropriate serial FBC; reassess immediately if warning signs develop.";
      return line;
    });
    if(["outpatient","monitoring"].includes(option)) lines.push("Monitor and document urine output: at least 0.5 mL/kg/hour where measurable, usually 4–6 voids/day and at least once every 6 hours.");
    if(option === "refer") lines.push("Stabilise before/during transfer, inform the receiving hospital, and send the clerking, investigations, monitoring record and fluid chart.");
    lines.push(...C.medicationAdvice(s));
    const override=val(`${p}CpgDispositionReason`).trim();
    if(override) lines.push(`Clinician disposition decision / rationale: ${override}`);
    else if(a.needsHospital && option !== "refer") lines.push("Disposition requires review: documented findings indicate hospital assessment/admission or emergency referral.");
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
    if(a.needsHospital && option !== "refer" && !val(`${p}CpgDispositionReason`).trim()) errors.push("Select ED referral or document the clinician's disposition rationale for the findings requiring hospital assessment.");
    if(on(`${p}CpgFluidRestricted`) && !val(`${p}CpgFluidRegimen`).trim()) errors.push("Document the individualised fluid regimen.");
    if(option === "discharge" && !C.dischargeReady(dischargeState())) errors.push("Complete the recovery review and explicit clinician decision before stopping routine FBC monitoring.");
    if(option === "discharge" && (a.needsHospital || s.haemo !== "haemodynamically stable")) errors.push("Resolve the recorded acute findings requiring hospital assessment before selecting routine discharge / stopping FBC.");
    if(option === "refer" && on(p === "cl"?"clPlanSubReferFluid":"dfuPlanSubReferFluid") && !fluid(p).valid) errors.push("Resolve the fluid calculation, or untick Start IV fluid if no IV prescription is intended.");
    if(on(`${p}IntVoltaren`) && !val(`${p}CpgSteroidIndication`).trim()) errors.push("IM diclofenac is inappropriate as dengue treatment. If already administered, record the prior-exposure context; this must not be interpreted as a dengue treatment recommendation.");
    if(on(`${p}IntHydro`) && !val(`${p}CpgSteroidIndication`).trim()) errors.push("Document the separate indication for hydrocortisone; corticosteroids are not dengue treatment.");
    for(const key of ["VomitLast24","StoolLast24","CpgVoids"]) {
      const n=C.number(val(p+key)); if(n !== null && (n<0 || !Number.isInteger(n))) errors.push("Episode / void counts must be non-negative whole numbers.");
    }
    const status=el(`${p}CpgValidation`);
    if(status){status.textContent=errors.join(" ");status.classList.toggle("hidden",!errors.length);if(errors.length) status.scrollIntoView?.({behavior:"smooth",block:"center"});}
    return errors.length === 0;
  }
  function refresh(p) {
    const isAdult=adult(p), isActive=active(p), c=cfg(p), root=el(c.root);
    if(!root) return;
    root.dataset.cpgAdult=String(isAdult);
    root.querySelectorAll(".adult-cpg4").forEach(x=>x.classList.toggle("hidden",!isActive));
    const febrile=el(c.state)?.querySelector('option[value="febrile"]');if(febrile){febrile.disabled=!isAdult;febrile.hidden=!isAdult;}
    if(!isAdult && val(c.state) === "febrile") setValue(c.state,"no-warning");
    const cpgBasis=el(c.basis)?.querySelector('option[value="cpg"]');if(cpgBasis){cpgBasis.disabled=!isAdult;cpgBasis.hidden=!isAdult;}
    const warnOption=el(c.state)?.querySelector('option[value="warning"]');if(warnOption) warnOption.textContent=isAdult?"Critical phase with warning signs (B2)":"With warning signs / unable oral intake";
    root.querySelectorAll(".dengue-frequency-shell").forEach(shell=>{
      const hint=shell.querySelector(".dengue-frequency-threshold");if(!hint)return;
      hint.textContent=!isAdult?"≥3 episodes in 24 hours is classified as a dengue warning sign.":shell.id.includes("Vomit")?"Adult CPG4: persistent vomiting >3 episodes/24 h; interpret near/in critical phase with the full clinical assessment.":"Loose stool: assess dehydration and oral tolerance; not a standalone adult dengue warning sign.";
    });
    const fluidLabel=el(p === "cl"?"clPlanSubOutFluid":"dfuPlanSubMonFluid")?.parentElement?.querySelector("span");
    if(fluidLabel) fluidLabel.textContent=isAdult?"Oral fluids 200 mL/hour while awake / individualised restriction":"Encourage adequate oral fluids according to age, weight and clinical tolerance";
    if(!isActive) return;
    const s=state(p), a=C.assess(s);
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
    window.renderDengueReferralAlert?.(c.mode,{silent:true});
    if(p === "cl") window.renderDenguePlanPreview?.(); else window.renderDengueFollowUpPlan?.();
    // Keep a calculated result current when inputs change, rather than retaining a stale dose.
    if(el(c.result)?.dataset.cpgCalculated === "true") setText(c.result,fluid(p).display);
  }
  function init() {
    for(const p of ["cl","dfu"]) {
      const c=cfg(p), root=el(c.root); if(!root)continue;
      root.addEventListener("input",event=>{
        if(event.target.matches("textarea[id$='Output'],textarea[id$='GeneratedDx']"))return;
        refresh(p);
      });
      root.addEventListener("change",event=>{
        if(event.target.id === c.group && adult(p)) setValue(c.basis,"cpg");
        if(adult(p) && [c.state,c.group].includes(event.target.id)) rates(p);
        refresh(p);
      });
      el(p === "cl"?"dfCalculate":"dfuFluidCalculate")?.addEventListener("click",()=>{
        if(active(p) && el(c.result)){el(c.result).dataset.cpgCalculated="true";setText(c.result,fluid(p).display);}
      });
      el(`${p}Reset`)?.addEventListener("click",()=>{if(el(c.result))el(c.result).dataset.cpgCalculated="false";refresh(p);});
      if(adult(p)){rates(p);refresh(p);}
    }
  }
  window.MedAssistDengueCpg4UI={state,active,referral,warningData,diagnosis,syncWeight,rates,fluid,oralAdvice,adjustPlan,recordLines,validate,refresh};
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
