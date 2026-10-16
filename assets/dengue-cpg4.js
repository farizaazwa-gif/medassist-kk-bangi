/* Adult dengue rules. Source: MOH Management of Dengue in Adults, Fourth Edition,
 * supplied 12-10-2026 PDF. Printed page references are part of the public API.
 * Paediatric rules are deliberately outside this module. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MedAssistDengueCpg4 = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SOURCE = "MOH Adult Dengue CPG, Fourth Edition (2026)";
  const QUOTA_TABLE = Object.freeze({30:3200,35:3600,40:3900,45:4300,50:4700,55:5000,60:5400,65:5700,70:6000});
  const unique = items => [...new Set(items.filter(Boolean))];
  const number = value => value === "" || value === null || value === undefined || typeof value === "boolean"
    ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const positive = value => number(value) !== null && number(value) > 0;
  const round = value => Math.round((value + Number.EPSILON) * 10) / 10;
  const nearCritical = s => s.phase === "critical phase" || Boolean(s.nearCritical);
  const shock = s => /^(?:compensated|decompensated) shock$/.test(s.haemo || "");

  function weights({weight, height, sex, basis = "cpg"}) {
    const w = number(weight), h = number(height);
    if (!positive(w)) return {valid:false, error:"Enter a positive body weight."};
    const bmi = positive(h) ? w / ((h / 100) ** 2) : null;
    const ibw = positive(h) && ["Male", "Female"].includes(sex)
      ? (sex === "Male" ? 50 : 45.5) + 0.91 * (h - 152) : null;
    const obese = bmi !== null && bmi > 27.5; // CPG Table 13, p48: >27.5, not >=.
    const abw = positive(ibw) ? ibw + 0.4 * (w - ibw) : null;
    if (basis === "cpg" && bmi === null) return {valid:false, bmi, ibw, abw, error:"Enter height to assess BMI, or explicitly select and document a clinician weight override."};
    const selectedBasis = basis === "cpg" ? (obese ? "adj" : "actual") : basis;
    const selected = selectedBasis === "actual" ? w : selectedBasis === "adj" ? abw : selectedBasis === "ibw" ? ibw : null;
    if (!positive(selected)) return {valid:false, bmi, ibw, abw, error:"Enter height and sex for IBW/ABW. Confirm a valid weight basis."};
    return {valid:true, actual:w, bmi, ibw, abw, obese, selected, basis:selectedBasis,
      manual:basis !== "cpg", maintenanceWeight:Math.min(selected,70),
      label:({actual:"actual body weight",adj:"adjusted body weight",ibw:"ideal body weight"})[selectedBasis]};
  }

  function maintenance(weight) {
    if (!positive(weight)) return null;
    const w = Math.min(number(weight),70);
    return 4 * Math.min(w,10) + 2 * Math.min(Math.max(w-10,0),10) + Math.max(w-20,0);
  }

  function quota(weight) {
    if (!positive(weight)) return null;
    const w = Math.min(number(weight),70), hourly = maintenance(w);
    const formula = round(hourly * 24 + 50 * w); // Appendix 11 p114: ONE day's M + deficit, over 48h.
    const table = QUOTA_TABLE[w] ?? null;
    return {weight:w, hourly, formula, table, differs:table !== null && table !== formula};
  }

  function assess(s) {
    const candidates = [], concerns = [], risks = [], urgent = [];
    const vomit = number(s.vomit), stool = number(s.stool);
    if (vomit !== null && Number.isInteger(vomit) && vomit > 3) candidates.push(`persistent vomiting (${vomit} episodes/24 h)`);
    if (s.worseDefervescence) candidates.push("clinical worsening as fever subsides");
    if (s.intenseAbdominalPain) candidates.push("intense abdominal pain or tenderness");
    if (s.lethargy) candidates.push("lethargy / restlessness / altered behaviour");
    if (s.fluidAccumulation) candidates.push("clinical fluid accumulation");
    if (s.postural) candidates.push("postural hypotension");
    if (s.liverGt2) candidates.push("liver enlargement >2 cm");
    if (s.lowUrine4h) candidates.push("reduced or absent urine for 4–6 hours");
    if (s.bleeding) candidates.push("bleeding manifestation");
    if (s.rapidHctPlt) candidates.push("rising haematocrit with rapidly falling platelets (clinician confirmed)");
    candidates.push(...(s.manualWarnings || []).filter(x => !/loose stool|diarrh/i.test(x)));
    const warningSigns = nearCritical(s) || s.warningConfirmed ? unique(candidates) : [];
    if (s.warningConfirmed && !warningSigns.length) warningSigns.push("warning signs confirmed by clinician");
    if (!nearCritical(s)) concerns.push(...unique(candidates).map(x => `${x}: assess phase and cause; not automatically classified as DWWS`));
    if (s.abdominalPain && !s.intenseAbdominalPain) concerns.push("abdominal pain: assess intensity and tenderness");
    if (vomit !== null && vomit > 0 && vomit <= 3) concerns.push(`vomiting ${vomit} episode(s)/24 h: assess hydration and oral tolerance`);
    if (stool !== null && stool > 0) concerns.push(`loose stool ${stool} episode(s)/24 h: assess dehydration and oral tolerance`);
    if (s.oral === "unable") concerns.push("unable to tolerate oral fluids — hospital assessment");
    if (s.oral === "reduced") concerns.push("reduced oral intake — assess hydration");
    if (s.oral === "able" && s.oralAdequacy === "inadequate") concerns.push("oral intake assessed as inadequate — reassess hydration and ongoing losses");
    if (s.dehydrated) concerns.push("dehydration — assess severity; moderate/severe dehydration requires IV fluid and hospital management");
    if (s.reducedUrine && !s.lowUrine4h) concerns.push("reduced urine — establish duration, volume and perfusion");
    if (s.sob && !s.leakRespiratory) concerns.push("shortness of breath — assess promptly for respiratory distress / plasma leakage");
    if (s.labTrend && !s.rapidHctPlt) concerns.push("HCT rising / platelets falling — assess trend and phase; no automatic IV bolus");
    if (s.comorbidity) risks.push("co-morbidity documented — assess stability and need for hospital observation");
    if (s.unstableComorbidity) risks.push("unstable co-morbidity — hospital referral required");
    if (s.obese) risks.push("obesity");
    if (number(s.age) > 65) risks.push("age >65 years");
    if (s.pregnant) risks.push("pregnancy — confirmed dengue requires hospital admission (p72)");
    if (s.bloodThinner) risks.push("antiplatelet / anticoagulant treatment");
    if (s.social) risks.push("social factor limiting follow-up or access to care");
    if (shock(s)) urgent.push(s.haemo);
    if (s.severeBleeding) urgent.push("severe bleeding requiring intervention");
    if (s.severeOrgan) urgent.push("severe organ involvement");
    if (s.leakRespiratory) urgent.push("severe plasma leakage with respiratory distress");
    if (s.seizure) urgent.push("seizure — emergency assessment");
    if (["compensated","decompensated"].includes(s.fluidState) && !shock(s)) urgent.push("shock selected in fluid calculator — reconcile haemodynamic assessment");
    const severe = shock(s) || s.severeBleeding || s.severeOrgan || s.leakRespiratory;
    const needsHospital = Boolean(urgent.length > 0 || warningSigns.length > 0 || s.oral === "unable" || s.unstableComorbidity || s.pregnant || s.moderateSevereDehydration);
    const group = severe ? "C" : warningSigns.length ? "B2" : risks.length ? "B1" : concerns.length || urgent.length ? "review" : "A";
    const title = ({C:"Group C — severe dengue: emergency referral",B2:"Group B2 — dengue with warning signs: admit to hospital",B1:"Group B1 — assess need for hospital referral / observation",review:"Clinical reassessment required",A:"Group A candidate — confirm outpatient suitability"})[group];
    return {group, warningSigns, concerns:unique(concerns), risks:unique(risks), urgent:unique(urgent), needsHospital,
      level:urgent.length ? "red" : warningSigns.length || risks.length || concerns.length ? "amber" : "neutral", title,
      reasons:unique([...urgent,...warningSigns,...risks,...concerns]),
      summary:group === "A" ? "Confirm stable haemodynamics, adequate intake/urine, no warning signs and reliable daily review."
        : group === "B1" ? "Stable co-morbidity alone is not an automatic admission decision. Use the total clinical assessment."
        : "Use the total clinical assessment; update diagnosis, phase and disposition at every review."};
  }

  function fluidCategories(s) {
    if (s.haemo === "compensated shock") return {allowed:["compensated"],preferred:"compensated"};
    if (s.haemo === "decompensated shock") return {allowed:["decompensated"],preferred:"decompensated"};
    if (s.phase === "recovery phase") return {allowed:["no-warning"],preferred:"no-warning"};
    const warning = assess(s).warningSigns.length > 0;
    if (nearCritical(s) && warning) return {allowed:s.phase === "febrile phase" ? ["warning","febrile"] : ["warning"],preferred:"warning"};
    if (s.phase === "febrile phase") return {allowed:warning ? ["febrile"] : ["no-warning","febrile"],preferred:warning || s.oral !== "able" || s.dehydrated ? "febrile" : "no-warning"};
    return {allowed:["no-warning"],preferred:"no-warning"};
  }

  function oralRate(volume, period = "1") {
    const amount=number(volume), hours=number(period);
    if(amount === null || amount < 0 || ![1,24].includes(hours)) return null;
    return amount / hours;
  }

  function fluid(s) {
    const fail = (message, headline = "IV rate not calculated") => ({valid:false, display:message, plan:message, headline, action:message});
    const result = (message, headline, action) => ({valid:true, display:message, plan:message, headline, action});
    const category = s.fluidState;
    if (!["no-warning","febrile","warning","compensated","decompensated"].includes(category)) return fail("Select a valid adult fluid category.");
    const declared = s.haemo === "compensated shock" ? "compensated" : s.haemo === "decompensated shock" ? "decompensated" : null;
    if ((declared && category !== declared) || (["compensated","decompensated"].includes(category) && category !== declared)) return fail("Reconcile haemodynamic status and fluid category before prescribing. Shock requires emergency referral.");
    if (!declared && s.phase === "recovery phase") return fail("Recovery phase: reassess and reduce/stop unnecessary IV fluid; no automatic critical-phase regimen.");
    if (category === "no-warning" && assess(s).needsHospital) return fail("Recorded findings require hospital assessment. Review the phase, warning signs, haemodynamics and oral intake before choosing a fluid pathway; this result does not establish outpatient suitability.");
    if (category === "no-warning") return fail(s.oral === "unable" || s.dehydrated
      ? "Oral intolerance / dehydration requires reassessment. Select the phase-appropriate pathway and assess hospital referral."
      : "No routine IV fluid indicated. Use oral hydration and daily clinical reassessment; confirm outpatient suitability.");
    if (category === "febrile" && s.phase !== "febrile phase") return fail("The febrile maintenance pathway requires a clinician-confirmed febrile phase.");
    if (category === "warning" && !nearCritical(s)) return fail("B2 fluid pathway requires assessment near/in critical phase. Assess dehydration separately in febrile illness.");
    if (category === "warning" && !assess(s).warningSigns.length) return fail("Confirm dengue warning signs before using the B2 fluid pathway.");
    // Oral tolerance alone does not establish adequate intake (CPG pp41–42,44).
    // Ask for the clinician's assessment instead of inferring adequacy from the default dropdown.
    if (["febrile","warning"].includes(category) && s.oral === "able" && !s.dehydrated) {
      if (!["adequate","inadequate"].includes(s.oralAdequacy)) return fail("Able to drink does not confirm sufficient intake. Select oral intake adequacy above based on the current clinical assessment.", "Confirm oral intake adequacy");
      if (s.oralAdequacy === "adequate") return fail(`Oral intake is assessed as adequate and no dehydration is recorded. Routine IV fluid is not indicated; reassess intake, perfusion and urine output.${category === "warning" ? " Group B2 still requires hospital admission. [CPG p44]" : " [CPG pp41–42]"}`);
    }
    const w = weights(s);
    if (!w.valid) return fail(w.error);
    if (w.manual && !s.weightReason) return fail("Document the reason for the clinician-selected weight basis, or select CPG automatic weight.");
    const name = `${round(w.selected)} kg ${w.label}`;
    if (declared) {
      const amount = round(w.selected * (declared === "compensated" ? 10 : 20));
      return result(`Initial isotonic crystalloid ${amount} mL over ${declared === "compensated" ? "1 hour (10 mL/kg)" : "15–30 minutes (20 mL/kg)"} using ${name}. Reassess CCTVR, BP/pulse pressure, HCT and urine output. Arrange emergency hospital transfer; do not delay transfer to finish the infusion. The non-shock fluid quota and 70 kg maintenance cap do not limit shock resuscitation. [CPG Algorithm ${declared === "compensated" ? "2" : "3"}]`, `Isotonic crystalloid ${amount} mL over ${declared === "compensated" ? "1 hour" : "15–30 minutes"}`, "Reassess CCTVR, BP/pulse pressure, HCT and urine output. Emergency hospital transfer; do not delay to complete the infusion.");
    }
    const capped = w.maintenanceWeight;
    if (category === "febrile") {
      const total = maintenance(capped);
      const oral = oralRate(s.oralHourly, s.oralPeriod);
      if (oral === null) return fail("Enter a non-negative oral volume (0 if none) and select mL/hour or mL/24 hours to calculate the IV component of maintenance.");
      const iv = Math.max(total-oral,0);
      const recorded=Number(s.oralPeriod) === 24 ? `${number(s.oralHourly)} mL/24 hours (average ${round(oral)} mL/hour; confirm this reflects current intake)` : `${round(oral)} mL/hour`;
      return {...result(`Febrile maintenance estimate: oral + IV ${round(total)} mL/hour (Holliday–Segar 4/2/1; calculation weight ${round(capped)} kg, capped at 70 kg). Documented oral intake ${recorded}; IV component ${round(iv)} mL/hour of isotonic crystalloid. ${iv === 0 ? "No additional routine IV maintenance is calculated. " : ""}Assess additional losses individually; reduce/stop IV when oral intake improves and dehydration is corrected. Moderate/severe dehydration requires hospital management. [CPG pp31,40–42]`, iv === 0 ? "IV maintenance component: 0 mL/hour" : `IV isotonic crystalloid ${round(iv)} mL/hour`, `Oral + IV target: ${round(total)} mL/hour; oral intake: ${recorded}. ${iv === 0 ? "Oral intake meets/exceeds this maintenance estimate; no additional routine IV maintenance is calculated. Check the intake unit and reassess losses/hydration." : "Reduce/stop IV as intake and hydration improve."} Moderate/severe dehydration needs hospital management.`),canPrescribe:iv>0};
    }
    const rate = number(s.rate);
    if (![3,4,5].includes(rate)) return fail("Select an initial B2 rate within 3–5 mL/kg/hour.");
    return result(`Initial isotonic crystalloid ${round(rate*capped)} mL/hour (${rate} mL/kg/hour; calculation weight ${round(capped)} kg, capped at 70 kg). Reassess after 1 hour (Algorithm 1); text p44 allows 1–2 hours according to response. Subsequent rate is reassessment-dependent, not an automatic schedule. Group B2 requires admission; stabilise and transfer. Include oral + IV in the non-shock 48-hour quota and stop applying that quota if shock develops. [CPG pp44,46]`, `Isotonic crystalloid ${round(rate*capped)} mL/hour`, "Reassess after 1 hour. Group B2 requires admission; stabilise and transfer. Further rates depend on reassessment.");
  }

  function vaccineDays(vaccinated, encounter) {
    const parse = value => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
      const t = Date.parse(`${value}T00:00:00Z`);
      return Number.isFinite(t) && new Date(t).toISOString().slice(0,10) === value ? t : null;
    };
    const a = parse(vaccinated), b = parse(encounter);
    return a === null || b === null ? null : (b-a)/86400000;
  }
  function medicationAdvice(s) {
    const lines=[];
    if (s.sglt2) lines.push("SGLT2 inhibitor: temporarily withhold during acute illness, dehydration or reduced oral intake; review restarting in recovery (CPG p33).");
    if (s.metformin) lines.push("Metformin: continuation requires absence of contraindications; review renal impairment, dehydration and haemodynamic instability (CPG p33).");
    if (s.statin) lines.push("Statin: may continue if there is no contraindication (CPG p33).");
    if (s.nsaid || s.steroid) lines.push("Avoid NSAIDs/corticosteroids as dengue treatment. Review existing chronic indications individually; do not automatically stop chronic corticosteroid therapy (CPG pp32,34).");
    if (s.bloodThinner) lines.push("Review antiplatelet/anticoagulant therapy individually. Recent stenting requires specialist discussion; anticoagulant use may require hospital assessment (CPG p32).");
    if (s.derangedLiver) lines.push("Avoid/discontinue paracetamol if liver enzymes are deranged; use clinical judgement and alternative supportive measures (CPG Recommendation 3, p34).");
    return lines;
  }
  function dischargeReady(s) {
    return Boolean(s.afebrileConfirmed && s.improving && s.stable && s.intakeUrine && s.noBleedingResp && s.labsReviewed && s.stopFbcConfirmed);
  }
  return {SOURCE, QUOTA_TABLE, number, round, nearCritical, weights, maintenance, quota, assess, fluidCategories, oralRate, fluid, vaccineDays, medicationAdvice, dischargeReady};
});
