/* Mandatory items before a dengue clinical note / referral can be generated
 * (new case "cl" and follow-up "dfu"):
 *   Weight, then the six diagnosis items —
 *   1. Dengue fever (adults: suspected / confirmed, with lab evidence if confirmed)
 *   2. Day of illness  3. Phase  4. With / without warning signs
 *   5. Shock status    6. Comorbidities (with list if present)
 *   Adults (CPG4 flow): "Clinical assessment reviewed" tick, without which no diagnosis is produced.
 * Draft saving is not blocked. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MedAssistDengueRequired = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GENERIC_CONFIRMED = "warning signs confirmed by clinician";
  const meaningful = text => !/^(?:\s*|no|nil|none|nkmi|n\/a|na|-|no known medical illness)$/i.test(String(text ?? "").trim());
  const filled = text => String(text ?? "").trim() !== "";

  /* Pure rule set — returns [{field, label}] in display order. */
  function evaluate(input) {
    const p = input.prefix === "dfu" ? "dfu" : "cl";
    const items = [];
    const add = (field, label) => items.push({ field, label });

    if (!(Number(input.weight) > 0)) add(`${p}Weight`, "Weight (kg)");

    if (p === "cl") {
      if (!filled(input.dxType)) add("clDxType", "1. Diagnosis");
      else if (input.dxType === "Other" && !filled(input.dxOther)) add("clDxOther", "1. Diagnosis — enter the diagnosis");
    }
    const dengue = p === "dfu" || input.dxType === "Dengue fever";
    if (!dengue) return items;

    if (input.adult) {
      if (!["suspected", "confirmed"].includes(input.certainty)) add(`${p}CpgDxCertainty`, "1. Dengue — select suspected or confirmed");
      else if (input.certainty === "confirmed" && !filled(input.evidence)) add(`${p}CpgDxEvidence`, "1. Confirmed dengue — record the laboratory evidence");
    }

    const day = Number(input.day);
    if (!filled(input.day) || !Number.isInteger(day) || day < 1) add(p === "cl" ? "clDxDay" : "dfuDayIllness", "2. Day of illness");

    if (!filled(input.phase)) add(`${p}Phase`, "3. Phase");

    const effective = input.effectiveWarnings || [];
    if (!filled(input.warningChoice)) {
      add(`${p}DxWarning`, "4. Warning signs — with or without");
    } else if (input.warningChoice === "with") {
      if (!effective.length) add(input.warningTarget || `${p}DxWarning`, "4. Warning signs — record the warning sign(s) present");
      else if (input.adult && effective.length === 1 && effective[0] === GENERIC_CONFIRMED && !filled(input.warningDetail)) {
        add(`${p}CpgWarningDetail`, "4. Warning signs — specify the warning sign / clinical rationale");
      }
    } else if (input.warningChoice === "without" && effective.length) {
      add(`${p}DxWarning`, "4. Warning signs — findings are recorded; select “With warning signs”");
    }

    if (!filled(input.haemo)) add(`${p}Haemo`, "5. Shock status");

    const top = p === "cl" && meaningful(input.topComorbid);
    if (!filled(input.comorbidStatus) && !top) add(`${p}DxComorbidStatus`, "6. Comorbidities — with or without");
    else if (input.comorbidStatus === "present" && !meaningful(input.comorbidDetail) && !top) add(`${p}DxComorbid`, "6. Comorbidities — list the comorbidities");

    if (input.adult && input.severeOrgan && !filled(input.organDetails)) add(`${p}OrganFailureDetails`, "Severe organ involvement — document the details");
    if (input.adult && !input.reviewed) add(`${p}CpgDxReviewed`, "Tick “Clinical assessment reviewed for this diagnosis”");
    return items;
  }

  const api = { evaluate, GENERIC_CONFIRMED };
  if (typeof document === "undefined") return api;

  /* ---------------- Browser wiring ---------------- */
  const el = id => document.getElementById(id);
  const val = id => el(id)?.value ?? "";
  const on = id => Boolean(el(id)?.checked);
  const PREFIXES = ["cl", "dfu"];
  const ROOTS = { cl: "dengueNewCaseTemplate", dfu: "dengueFollowUpTemplate" };
  const GENERATE = { cl: ["clGenerate", "clGenerateReferral"], dfu: ["dfuGenerate", "dfuGenerateReferral"] };
  const isAdult = p => val(p === "cl" ? "dfGroup" : "dfuGroup") === "adult";
  const cpgActive = p => isAdult(p) && (p !== "cl" || val("clDxType") === "Dengue fever");
  const UI = () => window.MedAssistDengueCpg4UI;
  const C = () => window.MedAssistDengueCpg4;

  function adultWarnings(p, withConfirmation) {
    try {
      const s = UI()?.state?.(p);
      if (!s || !C()) return [];
      return C().assess(withConfirmation ? s : { ...s, warningConfirmed: false }).warningSigns || [];
    } catch (_) { return []; }
  }
  // Findings recorded on the form (excluding a confirmation set from the warning-sign selector).
  function recordedWarnings(p) {
    if (cpgActive(p)) return adultWarnings(p, false);
    if (p === "cl") return typeof window.clPaedsWarningList === "function" ? window.clPaedsWarningList() : [];
    try { return typeof window.warningSignData === "function" ? (window.warningSignData().positive || []) : []; } catch (_) { return []; }
  }
  // Warning signs that will appear in the diagnosis.
  function effectiveWarnings(p) {
    if (cpgActive(p)) return adultWarnings(p, true);
    return recordedWarnings(p);
  }
  function warningTarget(p) {
    if (cpgActive(p)) return `${p}CpgWarningPanel`;
    return p === "cl" ? "clWarningSigns" : "dfuWarningStatusDisplay";
  }

  function severeOrganRecorded(p) {
    try { return Boolean(UI()?.state?.(p)?.severeOrgan); } catch (_) { return false; }
  }
  function collect(p) {
    const adult = cpgActive(p);
    return {
      prefix: p, adult,
      weight: val(`${p}Weight`),
      dxType: p === "cl" ? val("clDxType") : "Dengue fever",
      dxOther: val("clDxOther"),
      certainty: val(`${p}CpgDxCertainty`), evidence: val(`${p}CpgDxEvidence`), reviewed: on(`${p}CpgDxReviewed`),
      day: val(p === "cl" ? "clDxDay" : "dfuDayIllness"),
      phase: val(`${p}Phase`),
      warningChoice: val(`${p}DxWarning`),
      effectiveWarnings: effectiveWarnings(p),
      warningTarget: warningTarget(p),
      warningDetail: val(`${p}CpgWarningDetail`),
      haemo: val(`${p}Haemo`),
      comorbidStatus: val(`${p}DxComorbidStatus`),
      comorbidDetail: val(`${p}DxComorbid`),
      topComorbid: p === "cl" ? val("clComorbid") : "",
      severeOrgan: adult ? severeOrganRecorded(p) : false,
      organDetails: val(`${p}OrganFailureDetails`)
    };
  }
  function missing(p) { return evaluate(collect(p)); }

  function rebuildDiagnosis(p) {
    try {
      if (p === "cl" && typeof window.buildDiagnosis === "function") window.buildDiagnosis();
      if (p === "dfu" && typeof window.buildDengueFollowUpDiagnosis === "function") window.buildDengueFollowUpDiagnosis();
    } catch (_) { /* diagnosis preview is non-critical */ }
  }

  let syncing = false;
  function syncWarningChoice(p) {
    const select = el(`${p}DxWarning`);
    if (!select) return;
    const recorded = recordedWarnings(p);
    const without = select.querySelector('option[value="without"]');
    if (recorded.length) {
      if (select.value !== "with") { select.value = "with"; select.dataset.auto = "1"; }
      if (without) without.disabled = true;
    } else {
      if (without) without.disabled = false;
      if (select.dataset.auto === "1") { select.value = ""; delete select.dataset.auto; }
    }
    const help = el(`${p}DxWarningHelp`);
    if (help) help.textContent = recorded.length
      ? `Recorded: ${recorded.join(", ")}`
      : "Set automatically to “With” when warning findings are recorded.";
  }

  // Clinician selects "With" without recorded findings → use the existing clinician-confirmation path.
  function applyWarningChoice(p) {
    const select = el(`${p}DxWarning`);
    if (!select) return;
    delete select.dataset.auto;
    const wantWith = select.value === "with" && !recordedWarnings(p).length;
    const confirm = p === "cl" ? el("clWarningStatus") : (cpgActive("dfu") ? el("dfuCpgWarningConfirmed") : null);
    if (!confirm) return;
    const isOn = confirm.type === "checkbox" ? confirm.checked : confirm.value === "present";
    if (wantWith && !isOn) {
      if (confirm.type === "checkbox") confirm.checked = true; else confirm.value = "present";
      select.dataset.confirmSet = "1";
      confirm.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (!wantWith && isOn && select.dataset.confirmSet === "1") {
      if (confirm.type === "checkbox") confirm.checked = false; else confirm.value = "none";
      delete select.dataset.confirmSet;
      confirm.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function markTarget(field) {
    const node = el(field);
    if (!node) return null;
    return node.type === "checkbox" ? (node.closest("label") || node) : node;
  }
  function clearMarks(p) {
    document.getElementById(ROOTS[p])?.querySelectorAll(".required-missing").forEach(node => {
      node.classList.remove("required-missing"); delete node.dataset.requiredFor;
    });
  }
  function refreshMarks(p) {
    const rootNode = el(ROOTS[p]);
    if (!rootNode || !rootNode.querySelector(".required-missing")) return;
    const still = new Set(missing(p).map(item => item.field));
    rootNode.querySelectorAll(".required-missing").forEach(node => {
      if (!still.has(node.dataset.requiredFor)) { node.classList.remove("required-missing"); delete node.dataset.requiredFor; }
    });
  }
  function mark(p, items) {
    clearMarks(p);
    items.forEach(item => {
      const node = markTarget(item.field);
      if (node) { node.classList.add("required-missing"); node.dataset.requiredFor = item.field; }
    });
  }

  function reveal(field) {
    const node = el(field);
    if (!node) return;
    for (let parent = node.parentElement; parent; parent = parent.parentElement) if (parent.tagName === "DETAILS") parent.open = true;
    node.scrollIntoView?.({ behavior: "smooth", block: "center" });
    if (typeof node.focus === "function") node.focus({ preventScroll: true });
  }

  let dialog = null, lastFocus = null;
  function closeDialog() {
    if (!dialog) return;
    dialog.classList.add("hidden");
    lastFocus?.focus?.({ preventScroll: true });
  }
  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("div");
    dialog.className = "dengue-required-backdrop hidden";
    dialog.innerHTML = '<div class="dengue-required-dialog" role="alertdialog" aria-modal="true" aria-labelledby="dengueRequiredTitle" aria-describedby="dengueRequiredIntro">'
      + '<h2 id="dengueRequiredTitle">Required fields not completed</h2>'
      + '<p id="dengueRequiredIntro">Complete these before generating the note. Tap an item to go to it.</p>'
      + '<ul class="dengue-required-list" id="dengueRequiredList"></ul>'
      + '<div class="dengue-required-actions"><button class="btn primary" type="button" id="dengueRequiredOk">OK</button></div></div>';
    document.body.appendChild(dialog);
    dialog.addEventListener("click", event => { if (event.target === dialog) closeDialog(); });
    dialog.querySelector("#dengueRequiredOk").addEventListener("click", closeDialog);
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !dialog.classList.contains("hidden")) closeDialog(); });
    return dialog;
  }
  function showDialog(items) {
    const box = ensureDialog();
    lastFocus = document.activeElement;
    const list = box.querySelector("#dengueRequiredList");
    list.textContent = "";
    items.forEach(item => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", () => { closeDialog(); setTimeout(() => reveal(item.field), 30); });
      li.appendChild(button);
      list.appendChild(li);
    });
    box.classList.remove("hidden");
    setTimeout(() => list.querySelector("button")?.focus(), 0);
  }

  function guard(event) {
    const button = event.target?.closest?.("button");
    if (!button) return;
    const p = PREFIXES.find(prefix => GENERATE[prefix].includes(button.id));
    if (!p) return;
    syncWarningChoice(p);
    const items = missing(p);
    if (!items.length) { clearMarks(p); return; }
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    mark(p, items);
    showDialog(items);
  }

  const pending = new Set();
  function schedule(p) {
    if (pending.has(p)) return;
    pending.add(p);
    setTimeout(() => {
      pending.delete(p);
      if (syncing) return;
      syncing = true;
      try { syncWarningChoice(p); rebuildDiagnosis(p); refreshMarks(p); } finally { syncing = false; }
    }, 0);
  }

  function init() {
    document.addEventListener("click", guard, true);
    PREFIXES.forEach(p => {
      const rootNode = el(ROOTS[p]);
      if (!rootNode) return;
      ["input", "change"].forEach(type => rootNode.addEventListener(type, event => {
        if (event.target?.id === `${p}DxWarning` && type === "change") applyWarningChoice(p);
        schedule(p);
      }));
      el(`${p}Reset`)?.addEventListener("click", () => setTimeout(() => {
        const select = el(`${p}DxWarning`);
        if (select) { delete select.dataset.auto; delete select.dataset.confirmSet; }
        clearMarks(p); schedule(p);
      }, 0));
      schedule(p);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  return Object.assign(api, { collect, missing, syncWarningChoice });
});
