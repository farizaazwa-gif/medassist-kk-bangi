(() => {
  "use strict";

  if (typeof document === "undefined") return;

  const $ = id => document.getElementById(id);

  function numberMatch(text, pattern) {
    const match = String(text || "").match(pattern);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  function parseVitalText(prefix) {
    const raw = String($(`${prefix}VitalText`)?.value || "").trim();
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

  function adultMode(prefix) {
    const groupId = prefix === "dfu" ? "dfuGroup" : "dfGroup";
    const group = String($(groupId)?.value || "").toLowerCase();
    return !group || group === "adult";
  }

  function assess(prefix) {
    if (!adultMode(prefix)) return null;
    const vital = parseVitalText(prefix);

    if (!vital.raw) {
      return {
        category: "neutral",
        title: "Adult dengue haemodynamic assessment",
        summary: "Paste BP and pulse rate to screen the haemodynamic pattern.",
        detail: "Shock assessment still requires bedside perfusion findings, not vital signs alone.",
        vital
      };
    }

    if (vital.unrecordableBp) {
      return {
        category: "decompensated",
        title: "Decompensated / hypotensive shock pattern",
        summary: "Blood pressure documented as unrecordable.",
        detail: "Medical emergency — initiate dengue shock resuscitation and urgent hospital-level management.",
        vital
      };
    }

    if (vital.sbp === null || vital.dbp === null || vital.pp === null) {
      return {
        category: "neutral",
        title: "Haemodynamic assessment incomplete",
        summary: "A complete BP reading is needed to calculate pulse pressure.",
        detail: "Enter BP as systolic/diastolic and pulse rate where available.",
        vital
      };
    }

    const metrics = [`BP ${vital.sbp}/${vital.dbp} mmHg`, `PP ${vital.pp} mmHg`];
    if (vital.pulse !== null) metrics.push(`PR ${vital.pulse}/min`);
    if (vital.rr !== null) metrics.push(`RR ${vital.rr}/min`);

    // MOH Malaysia Adult Dengue CPG: SBP <90 mmHg and PP <20 mmHg are late signs of shock.
    if (vital.sbp < 90 || vital.pp < 20) {
      const triggers = [];
      if (vital.sbp < 90) triggers.push("SBP <90 mmHg");
      if (vital.pp < 20) triggers.push("pulse pressure <20 mmHg");
      return {
        category: "decompensated",
        title: "Decompensated / hypotensive shock pattern",
        summary: `${metrics.join(" • ")} — ${triggers.join(" + ")}.`,
        detail: "These are late adult dengue shock signs. Treat as a medical emergency; urgent resuscitation and hospital referral are required.",
        vital
      };
    }

    const tachycardia = vital.pulse !== null && vital.pulse >= 100;

    // A preserved systolic BP does NOT exclude compensated shock. The CPG lists tachycardia,
    // narrowing pulse pressure, raised diastolic pressure and bedside hypoperfusion signs.
    if (tachycardia) {
      return {
        category: "compensated",
        title: "Haemodynamic concern — possible compensated shock",
        summary: `${metrics.join(" • ")} — systolic BP is still ≥90 mmHg but tachycardia is present.`,
        detail: "Do not label this as ‘no shock’ from BP/PR alone. Assess CRT >2 s, cool extremities, weak/thready peripheral pulse, postural hypotension, tachypnoea, reduced urine output and intense thirst; look for a narrowing pulse-pressure trend.",
        vital
      };
    }

    return {
      category: "normal",
      title: "No shock trigger identified from the entered BP / PR",
      summary: metrics.join(" • ") + ".",
      detail: "This does not exclude compensated shock. Confirm capillary refill, peripheral temperature and pulse volume, postural BP, respiratory rate, urine output and thirst during the clinical assessment.",
      vital
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
      <small style="margin-top:5px">MOH Malaysia CPG: Management of Dengue Infection in Adults, 3rd Edition (current adult dengue CPG listed by MOH).</small>`;
  }

  function schedule(prefix) {
    // Existing clerking scripts also render this box. Re-apply after their synchronous
    // and short deferred work so the CPG interpretation remains the final display.
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
