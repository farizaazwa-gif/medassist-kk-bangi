(() => {
  "use strict";

  if (typeof document === "undefined") return;

  const $ = id => document.getElementById(id);
  const PREFIXES = ["cl", "dfu", "dm", "htn"];
  const DENGUE_PREFIXES = ["cl", "dfu"];

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function localIsoToday() {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function localDateTimeNow() {
    const now = new Date();
    return `${localIsoToday()}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  function formatDmy(iso) {
    const match = String(iso || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
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

  function dispatchDateChange(input) {
    if (!input) return;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setDengueDefaults(prefix, force = false) {
    if (!DENGUE_PREFIXES.includes(prefix)) return;

    const vital = $(`${prefix}VitalDateTime`);
    if (vital && (force || !vital.value)) {
      vital.value = localDateTimeNow();
      ensureHiddenDate(prefix, "vital").value = vital.value.slice(0, 10);
      dispatchDateChange(vital);
    } else if (vital?.value) {
      ensureHiddenDate(prefix, "vital").value = vital.value.slice(0, 10);
    }

    const fbc = $(`${prefix}QuickFbcDate`);
    if (fbc && (force || !fbc.value)) {
      fbc.value = localIsoToday();
      ensureHiddenDate(prefix, "fbc").value = fbc.value;
      dispatchDateChange(fbc);
    } else if (fbc?.value) {
      ensureHiddenDate(prefix, "fbc").value = fbc.value;
    }
  }

  function prefixOf(control) {
    const id = control?.id || "";
    return PREFIXES.find(prefix => id.startsWith(prefix)) || "";
  }

  function directContextText(control) {
    const container = control?.closest?.(
      ".ncd-result-date-row,.ncd-import-box,.ncd-lab-block,.card,.result-card,.lab-card,.investigation-card,.quick-fbc-card"
    );
    const heading = container?.querySelector?.("h2,h3,h4,.section-subtitle,label")?.textContent || "";
    return `${heading} ${container?.getAttribute?.("data-label") || ""}`.replace(/\s+/g, " ").trim();
  }

  function isFbcControl(control, prefix) {
    if (!control || !prefix) return false;
    const id = control.id || "";
    if (new RegExp(`^${prefix}(?:Quick)?Fbc`, "i").test(id)) return true;
    if (/BloodPaste$/i.test(id)) {
      const text = String(control.value || "");
      return /\bFBC\b|\bHb\b|\bHct\b|\bWCC?\b|\bplatelet\b|\bPlt\b/i.test(text);
    }
    return /\bFBC\b/i.test(directContextText(control));
  }

  function isVitalControl(control, prefix) {
    if (!control || !prefix) return false;
    const id = control.id || "";
    if (new RegExp(`^${prefix}Vital(?:Text|Paste|DateTime)$`, "i").test(id)) return true;
    const suffix = id.slice(prefix.length);
    return /^(?:Sbp|Dbp|Bp|BpSys|BpDia|Pulse|Pr|Temp|Temperature|Rr|Spo2|Weight|Height)$/i.test(suffix) ||
      /\bvital signs?\b/i.test(directContextText(control));
  }

  function stamp(prefix, kind) {
    const field = ensureHiddenDate(prefix, kind);

    if (DENGUE_PREFIXES.includes(prefix)) {
      if (kind === "vital") {
        const actual = $(`${prefix}VitalDateTime`);
        if (actual && !actual.value) {
          actual.value = localDateTimeNow();
          dispatchDateChange(actual);
        }
        field.value = actual?.value ? actual.value.slice(0, 10) : localIsoToday();
      } else {
        const actual = $(`${prefix}QuickFbcDate`);
        if (actual && !actual.value) {
          actual.value = localIsoToday();
          dispatchDateChange(actual);
        }
        field.value = actual?.value || localIsoToday();
      }
      return field.value;
    }

    if (!field.value) field.value = localIsoToday();
    if (kind === "fbc") {
      const resultDate = $(`${prefix}ResultDate`);
      if (resultDate && !resultDate.value) {
        resultDate.value = field.value;
        dispatchDateChange(resultDate);
      }
    }
    return field.value;
  }

  function syncSelectedDate(control, prefix) {
    if (!DENGUE_PREFIXES.includes(prefix)) return false;
    if (control.id === `${prefix}VitalDateTime`) {
      ensureHiddenDate(prefix, "vital").value = control.value ? control.value.slice(0, 10) : "";
      return true;
    }
    if (control.id === `${prefix}QuickFbcDate`) {
      ensureHiddenDate(prefix, "fbc").value = control.value || "";
      return true;
    }
    return false;
  }

  function hideOnlyNcdManualResultDates() {
    ["dm", "htn"].forEach(prefix => {
      const input = $(`${prefix}ResultDate`);
      if (!input) return;
      const row = input.closest(".ncd-result-date-row") || input.parentElement;
      if (row) row.style.display = "none";
      input.tabIndex = -1;
      input.setAttribute("aria-hidden", "true");
    });

    DENGUE_PREFIXES.forEach(prefix => {
      const vital = $(`${prefix}VitalDateTime`);
      const fbc = $(`${prefix}QuickFbcDate`);
      [vital, fbc].filter(Boolean).forEach(input => {
        const wrapper = input.parentElement;
        if (wrapper) wrapper.style.removeProperty("display");
        input.tabIndex = 0;
        input.removeAttribute("aria-hidden");
      });
    });
  }

  function annotateVitalDate(text, dmy) {
    if (!text || !dmy) return text;
    if (/^\s*Date\/Time\s*:/im.test(text)) return text;
    if (new RegExp(`VITALS(?: / ANTHROPOMETRY)? \\(${dmy.replace(/\//g, "\\/")}\\)`, "i").test(text)) return text;
    const updated = text.replace(
      /^(VITALS(?:\s*\/\s*ANTHROPOMETRY)?)(?:\s*\([^\n)]*\))?\s*:?$/im,
      `$1 (${dmy})`
    );
    return updated;
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
    if (DENGUE_PREFIXES.includes(prefix)) return;
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
    if (generate) generate.addEventListener("click", () => setTimeout(() => annotateOutput(prefix), 0));
    const copy = $(`${prefix}Copy`);
    if (copy) copy.addEventListener("click", () => annotateOutput(prefix), true);
  }

  function stampExistingValues(prefix) {
    const root = document.querySelector(`#page-${prefix}`) || document;
    const controls = [...root.querySelectorAll("input,select,textarea")]
      .filter(control => control.id?.startsWith(prefix));
    if (controls.some(control => control.value && isVitalControl(control, prefix))) stamp(prefix, "vital");
    if (controls.some(control => control.value && isFbcControl(control, prefix))) stamp(prefix, "fbc");
  }

  function init() {
    hideOnlyNcdManualResultDates();

    PREFIXES.forEach(prefix => {
      ensureHiddenDate(prefix, "vital");
      ensureHiddenDate(prefix, "fbc");
      bindOutputAnnotation(prefix);
    });

    DENGUE_PREFIXES.forEach(prefix => setDengueDefaults(prefix));
    ["dm", "htn"].forEach(stampExistingValues);

    document.addEventListener("input", event => {
      const control = event.target;
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
      const prefix = prefixOf(control);
      if (!prefix) return;
      if (syncSelectedDate(control, prefix)) return;
      if (control.value && isVitalControl(control, prefix)) stamp(prefix, "vital");
      if (control.value && isFbcControl(control, prefix)) stamp(prefix, "fbc");
    });

    document.addEventListener("change", event => {
      const control = event.target;
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
      const prefix = prefixOf(control);
      if (!prefix) return;
      if (syncSelectedDate(control, prefix)) return;
      if (control.value && isVitalControl(control, prefix)) stamp(prefix, "vital");
      if (control.value && isFbcControl(control, prefix)) stamp(prefix, "fbc");
    });

    DENGUE_PREFIXES.forEach(prefix => {
      $(`${prefix}Reset`)?.addEventListener("click", () => {
        setTimeout(() => {
          ensureHiddenDate(prefix, "vital").value = "";
          ensureHiddenDate(prefix, "fbc").value = "";
          setDengueDefaults(prefix, true);
        }, 0);
      });
    });

    const observer = new MutationObserver(() => hideOnlyNcdManualResultDates());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();