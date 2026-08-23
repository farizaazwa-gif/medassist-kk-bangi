(() => {
  "use strict";

  if (typeof document === "undefined") return;

  const $ = id => document.getElementById(id);
  const value = id => String($(id)?.value || "").trim();

  function numberMatch(text, pattern) {
    const match = String(text || "").match(pattern);
    if (!match) return null;
    const number = Number(match[1]);
    return Number.isFinite(number) ? number : null;
  }

  function parseVitalText(prefix) {
    const raw = value(`${prefix}VitalText`);
    const normalized = raw.replace(/\u00a0/g, " ");
    const unrecordableBp = /\b(?:BP|blood\s*pressure)\b[^\n]*(?:unrecordable|unable\s*to\s*record|not\s*recordable)/i.test(normalized);

    let sbp = null;
    let dbp = null;
    const bp = normalized.match(/\b(?:BP|blood\s*pressure)\s*[:=]?\s*(\d{2,3})\s*\/\s*(\d{2,3})\b/i);
    if (bp) {
      sbp = Number(bp[1]);
      dbp = Number(bp[2]);
    }

    const pulse = numberMatch(normalized, /\b(?:PR|HR|pulse(?:\s*rate)?)\s*[:=]?\s*(\d{2,3})\b/i);
    const rr = numberMatch(normalized, /\b(?:RR|resp(?:iratory)?\s*rate)\s*[:=]?\s*(\d{1,3})\b/i);
    const pp = Number.isFinite(sbp) && Number.isFinite(dbp) ? sbp - dbp : null;

    return { raw, sbp, dbp, pp, pulse, rr, unrecordableBp };
  }

  function clinicalFindings(prefix) {
    const mental = value(`${prefix}GeneralMental`);
    const colour = value(`${prefix}GeneralColour`);
    const crt = value(`${prefix}GeneralCrt`);
    const peripheries = value(`${prefix}GeneralPeripheries`);
    const pulseVolume = value(`${prefix}GeneralPulseVolume`);
    const breathing = value(`${prefix}GeneralBreathing`);

    const concern = [];
    const severe = [];

    if (crt === "crt > 2 sec") concern.push("CRT >2 sec");
    if (peripheries === "cool peripheries") concern.push("cool peripheries");
    if (pulseVolume === "weak & thready PV") concern.push("weak & thready peripheral pulse");
    if (breathing === "tachypneic") concern.push("tachypnoea");

    if (["restless", "combative", "lethargic", "drowsy / confused"].includes(mental)) {
      severe.push(`altered mental state (${mental})`);
    }
    if (colour === "mottled") severe.push("mottled skin");
    if (crt === "very prolonged crt") severe.push("very prolonged CRT");
    if (peripheries === "cold, clammy peripheries") severe.push("cold, clammy peripheries");
    if (pulseVolume === "feeble PV") severe.push("feeble peripheral pulse");
    if (pulseVolume === "absent peripheral pulse") severe.push("absent peripheral pulse");
    if (breathing === "hyperpnoea / Kussmaul breathing") severe.push("hyperpnoea / Kussmaul breathing");

    return { concern, severe };
  }

  function adultMode(prefix) {
    const groupId = prefix === "dfu" ? "dfuGroup" : "dfGroup";
    const group = value(groupId).toLowerCase();
    return !group || group === "adult";
  }

  function metrics(vital) {
    const parts = [];
    if (vital.sbp !== null && vital.dbp !== null) parts.push(`BP ${vital.sbp}/${vital.dbp} mmHg`);
    if (vital.pp !== null) parts.push(`PP ${vital.pp} mmHg`);
    if (vital.pulse !== null) parts.push(`PR ${vital.pulse}/min`);
    if (vital.rr !== null) parts.push(`RR ${vital.rr}/min`);
    return parts;
  }

  function joinSummary(vitalParts, bedsideParts) {
    const groups = [];
    if (vitalParts.length) groups.push(vitalParts.join(" • "));
    if (bedsideParts.length) groups.push(`Bedside: ${bedsideParts.join(", ")}`);
    return groups.join(" — ") + (groups.length ? "." : "");
  }

  function assess(prefix) {
    if (!adultMode(prefix)) return null;

    const vital = parseVitalText(prefix);
    const clinical = clinicalFindings(prefix);
    const vitalParts = metrics(vital);
    const hasAnyVital = Boolean(vital.raw);
    const completeBp = vital.sbp !== null && vital.dbp !== null && vital.pp !== null;

    if (vital.unrecordableBp) {
      return {
        category: "decompensated",
        title: "Decompensated / hypotensive shock pattern",
        summary: joinSummary(vitalParts, clinical.severe.concat(clinical.concern)) || "Blood pressure documented as unrecordable.",
        detail: "Medical emergency — initiate dengue shock resuscitation and urgent hospital-level management."
      };
    }

    if (completeBp && (vital.sbp < 90 || vital.pp < 20)) {
      const triggers = [];
      if (vital.sbp < 90) triggers.push("SBP <90 mmHg");
      if (vital.pp < 20) triggers.push("pulse pressure <20 mmHg");
      return {
        category: "decompensated",
        title: "Decompensated / hypotensive shock pattern",
        summary: `${joinSummary(vitalParts, clinical.severe.concat(clinical.concern))} Trigger: ${triggers.join(" + ")}.`,
        detail: "These are late adult dengue shock signs. Treat as a medical emergency; urgent resuscitation and hospital referral are required."
      };
    }

    if (clinical.severe.length) {
      return {
        category: "decompensated",
        title: "Severe haemodynamic concern — decompensated-shock-compatible bedside features",
        summary: joinSummary(vitalParts, clinical.severe.concat(clinical.concern)),
        detail: "These bedside findings are listed in the CPG under decompensated/hypotensive shock. Reassess BP, pulse pressure and perfusion immediately; a single field should not be interpreted in isolation."
      };
    }

    const tachycardia = vital.pulse !== null && vital.pulse >= 100;
    if (tachycardia || clinical.concern.length) {
      const concerns = clinical.concern.slice();
      if (tachycardia) concerns.unshift("tachycardia");
      return {
        category: "compensated",
        title: "Haemodynamic concern — possible compensated shock",
        summary: joinSummary(vitalParts, concerns),
        detail: "A preserved systolic BP does not exclude compensated shock. Correlate CRT, extremity temperature, peripheral pulse volume, postural BP, respiratory rate, urine output, thirst and pulse-pressure trend."
      };
    }

    if (!hasAnyVital) {
      return {
        category: "neutral",
        title: "Adult dengue haemodynamic assessment",
        summary: "Paste BP and pulse rate to screen the haemodynamic pattern.",
        detail: "Shock assessment still requires bedside perfusion findings, not vital signs alone."
      };
    }

    if (!completeBp) {
      return {
        category: "neutral",
        title: "Haemodynamic assessment incomplete",
        summary: "A complete BP reading is needed to calculate pulse pressure.",
        detail: "Enter BP as systolic/diastolic and pulse rate where available; bedside perfusion findings remain essential."
      };
    }

    return {
      category: "normal",
      title: "No shock trigger identified from the entered BP / PR and selected bedside findings",
      summary: joinSummary(vitalParts, []),
      detail: "This does not exclude evolving compensated shock. Continue serial clinical assessment and review CRT, peripheries, pulse volume, postural BP, respiratory rate, urine output and thirst."
    };
  }

  function render(prefix) {
    const box = $(`${prefix}VitalShockResult`);
    if (!box) return;

    const result = assess(prefix);
    if (!result) return;

    box.classList.remove("neutral", "normal", "compensated", "decompensated", "disabled");
    box.classList.add(result.category);
    box.dataset.cpgHaemodynamic = result.category;
    box.innerHTML = `
      <strong>${result.title}</strong>
      <span>${result.summary}</span>
      <small>${result.detail}</small>
      <small style="margin-top:5px">MOH Malaysia CPG: Management of Dengue Infection in Adults, 3rd Edition.</small>
    `;
  }

  function schedule(prefix) {
    window.setTimeout(() => render(prefix), 0);
    window.setTimeout(() => render(prefix), 80);
  }

  function init() {
    ["cl", "dfu"].forEach(prefix => {
      schedule(prefix);

      const input = $(`${prefix}VitalText`);
      ["input", "change", "paste"].forEach(eventName => {
        input?.addEventListener(eventName, () => schedule(prefix));
      });

      const group = $(prefix === "dfu" ? "dfuGroup" : "dfGroup");
      group?.addEventListener("change", () => schedule(prefix));

      $(`${prefix}Reset`)?.addEventListener("click", () => window.setTimeout(() => schedule(prefix), 20));
    });

    document.addEventListener("medassist:dengue-general-exam-change", event => {
      const prefix = event?.detail?.prefix;
      if (["cl", "dfu"].includes(prefix)) schedule(prefix);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
