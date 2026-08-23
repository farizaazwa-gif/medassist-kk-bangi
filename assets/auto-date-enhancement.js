(() => {
  "use strict";

  if (typeof document === "undefined") return;

  const $ = id => document.getElementById(id);
  const PREFIXES = ["cl", "dfu", "dm", "htn"];

  function localIsoToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDmy(iso) {
    const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
  }

  function ensureHiddenDate(prefix, kind) {
    const id = `${prefix}${kind === "vital" ? "VitalAutoDate" : "FbcAutoDate"}`;
    let input = $(id);
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.id = id;
      input.dataset.medassistAutoDate = kind;
      (document.querySelector(`#page-${prefix}`) || document.body).appendChild(input);
    }
    return input;
  }

  function stamp(prefix, kind) {
    const field = ensureHiddenDate(prefix, kind);
    if (!field.value) field.value = localIsoToday();

    if (kind === "fbc") {
      const resultDate = $(`${prefix}ResultDate`);
      if (resultDate && !resultDate.value) {
        resultDate.value = field.value;
        resultDate.dispatchEvent(new Event("input", { bubbles: true }));
        resultDate.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    return field.value;
  }

  function clearStamp(prefix, kind) {
    const field = ensureHiddenDate(prefix, kind);
    field.value = "";
    if (kind === "fbc") {
      const resultDate = $(`${prefix}ResultDate`);
      if (resultDate) resultDate.value = "";
    }
  }

  function prefixOf(control) {
    const id = control?.id || "";
    return PREFIXES.find(prefix => id.startsWith(prefix)) || "";
  }

  function directContextText(control) {
    const container = control?.closest?.(
      ".ncd-result-date-row,.ncd-import-box,.ncd-lab-block,.card,.result-card,.lab-card,.investigation-card"
    );
    const heading = container?.querySelector?.("h2,h3,h4,.section-subtitle,label")?.textContent || "";
    return `${heading} ${container?.getAttribute?.("data-label") || ""}`.replace(/\s+/g, " ").trim();
  }

  function isFbcControl(control, prefix) {
    if (!control || !prefix) return false;
    const id = control.id || "";
    if (new RegExp(`^${prefix}Fbc`, "i").test(id)) return true;
    if (/Fbc(?:Paste|Import)?$/i.test(id)) return true;
    if (/BloodPaste$/i.test(id)) {
      const text = String(control.value || "");
      return /\bFBC\b|\bHb\b|\bHct\b|\bWCC?\b|\bplatelet\b|\bPlt\b/i.test(text);
    }
    return /\bFBC\b/i.test(directContextText(control));
  }

  function isVitalControl(control, prefix) {
    if (!control || !prefix) return false;
    const id = control.id || "";
    if (/VitalPaste$/i.test(id)) return true;
    const suffix = id.slice(prefix.length);
    return /^(?:Sbp|Dbp|Bp|BpSys|BpDia|Pulse|Pr|Temp|Temperature|Rr|Spo2|Weight|Height)$/i.test(suffix) ||
      /\bvital signs?\b/i.test(directContextText(control));
  }

  function hideManualDatePickers() {
    ["dm", "htn"].forEach(prefix => {
      const input = $(`${prefix}ResultDate`);
      if (!input) return;
      const row = input.closest(".ncd-result-date-row") || input.parentElement;
      if (row) row.style.display = "none";
      input.tabIndex = -1;
      input.setAttribute("aria-hidden", "true");
    });

    document.querySelectorAll('input[type="date"]').forEach(input => {
      if (["dmResultDate", "htnResultDate"].includes(input.id)) return;
      const prefix = prefixOf(input);
      if (!prefix || !["cl", "dfu"].includes(prefix)) return;
      const context = directContextText(input);
      const label = input.labels?.[0]?.textContent || "";
      if (!/\b(?:FBC|vital signs?)\b/i.test(`${context} ${label}`)) return;
      const wrapper = input.closest(".ncd-result-date-row") || input.parentElement;
      if (wrapper) wrapper.style.display = "none";
      input.tabIndex = -1;
      input.setAttribute("aria-hidden", "true");
    });
  }

  function annotateVitalDate(text, dmy) {
    if (!text || !dmy) return text;
    if (new RegExp(`VITALS(?: / ANTHROPOMETRY)? \\(${dmy.replace(/\//g, "\\/")}\\)`, "i").test(text)) return text;

    let updated = text.replace(
      /^(VITALS(?:\s*\/\s*ANTHROPOMETRY)?)(?:\s*\([^\n)]*\))?\s*:?$/im,
      `$1 (${dmy})`
    );
    if (updated !== text) return updated;

    const lines = text.split("\n");
    const oe = lines.findIndex(line => /^\s*O\/E\s*:?/i.test(line));
    const start = oe >= 0 ? oe : 0;
    const end = Math.min(lines.length, start + 12);

    for (let i = start; i < end; i++) {
      const line = lines[i];
      if (/^\s*(?:Vital signs?|Vitals?)\s*(?:\([^)]*\))?\s*:/i.test(line)) {
        lines[i] = line.replace(
          /^\s*(?:Vital signs?|Vitals?)\s*(?:\([^)]*\))?\s*:/i,
          `Vital signs (${dmy}):`
        );
        return lines.join("\n");
      }
      if (/\bBP\s*[:=]?\s*\d{2,3}\s*\/\s*\d{2,3}\b/i.test(line) ||
          /\b(?:PR|Pulse|Temp(?:erature)?|SpO2|SpO₂|RR)\s*[:=]?\s*\d/i.test(line)) {
        lines[i] = `Vital signs (${dmy}): ${line.trim()}`;
        return lines.join("\n");
      }
    }
    return text;
  }

  function annotateFbcDate(text, dmy) {
    if (!text || !dmy) return text;
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*FBC\b/i.test(lines[i])) continue;
      if (/^\s*FBC\s*\(\d{1,2}\/\d{1,2}\/\d{4}\)/i.test(lines[i])) return text;
      lines[i] = lines[i].replace(/^\s*FBC\b/i, `FBC (${dmy})`);
      return lines.join("\n");
    }
    return text;
  }

  function annotateOutput(prefix) {
    const output = $(`${prefix}Output`);
    if (!output || !output.value) return;

    const vitalDate = formatDmy(ensureHiddenDate(prefix, "vital").value);
    const fbcDate = formatDmy(ensureHiddenDate(prefix, "fbc").value || $(`${prefix}ResultDate`)?.value);

    let text = output.value;
    if (vitalDate) text = annotateVitalDate(text, vitalDate);
    if (fbcDate) text = annotateFbcDate(text, fbcDate);
    output.value = text;
  }

  function bindOutputAnnotation(prefix) {
    const generate = $(`${prefix}Generate`);
    if (generate) {
      generate.addEventListener("click", () => setTimeout(() => annotateOutput(prefix), 0));
    }

    const copy = $(`${prefix}Copy`);
    if (copy) {
      copy.addEventListener("click", () => annotateOutput(prefix), true);
    }
  }

  function stampExistingValues(prefix) {
    const root = document.querySelector(`#page-${prefix}`) || document;
    const controls = [...root.querySelectorAll("input,select,textarea")]
      .filter(control => control.id?.startsWith(prefix));

    if (controls.some(control => control.value && isVitalControl(control, prefix))) stamp(prefix, "vital");
    if (controls.some(control => control.value && isFbcControl(control, prefix))) stamp(prefix, "fbc");
  }

  function resetDates(prefix) {
    clearStamp(prefix, "vital");
    clearStamp(prefix, "fbc");
  }

  function init() {
    hideManualDatePickers();

    PREFIXES.forEach(prefix => {
      ensureHiddenDate(prefix, "vital");
      ensureHiddenDate(prefix, "fbc");
      bindOutputAnnotation(prefix);
      stampExistingValues(prefix);
      $(`${prefix}Reset`)?.addEventListener("click", () => setTimeout(() => resetDates(prefix), 0));
    });

    document.addEventListener("input", event => {
      const control = event.target;
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
      const prefix = prefixOf(control);
      if (!prefix) return;
      if (control.value && isVitalControl(control, prefix)) stamp(prefix, "vital");
      if (control.value && isFbcControl(control, prefix)) stamp(prefix, "fbc");
    });

    document.addEventListener("change", event => {
      const control = event.target;
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
      const prefix = prefixOf(control);
      if (!prefix) return;
      if (control.value && isVitalControl(control, prefix)) stamp(prefix, "vital");
      if (control.value && isFbcControl(control, prefix)) stamp(prefix, "fbc");
    });

    const observer = new MutationObserver(() => hideManualDatePickers());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
