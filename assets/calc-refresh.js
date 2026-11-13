/* Calculator Refresh button (v18.252).
 * Adds "↺ Refresh" beside "← Back" in every calculator panel. Refresh puts that calculator back the way it
 * looked when the page loaded: every field to its starting value, every result box to its starting text.
 * A date field that started as today's date (e.g. Pregnancy dates → Assessment date) is set to today again. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MedAssistCalcRefresh = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const FIELDS = "input, select, textarea";
  const OUTPUTS = '.result-box, [id$="Result"], [id$="Summary"]';

  function localToday(now) {
    const d = now || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function today() {
    try {
      const value = root().pregnancyDates?.malaysiaToday?.();
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return value;
    } catch (error) { /* fall back to the device date */ }
    return localToday();
  }
  function root() { return typeof window !== "undefined" ? window : {}; }

  function readField(el) {
    if (el.type === "checkbox" || el.type === "radio") return { checked: el.checked };
    if (el.tagName === "SELECT" && el.multiple) return { selected: [...el.options].map(o => o.selected) };
    return { value: el.value, today: el.type === "date" && el.value !== "" && el.value === today() };
  }

  function writeField(el, saved) {
    if (el.type === "checkbox" || el.type === "radio") {
      el.checked = saved ? saved.checked : el.defaultChecked;
    } else if (el.tagName === "SELECT") {
      if (saved && saved.selected) [...el.options].forEach((o, i) => { o.selected = Boolean(saved.selected[i]); });
      else if (saved) el.value = saved.value;
      else {
        const preset = [...el.options].findIndex(o => o.defaultSelected);
        el.selectedIndex = preset >= 0 ? preset : (el.options.length ? 0 : -1);
      }
    } else if (el.type !== "file") {
      el.value = saved ? (saved.today ? today() : saved.value) : el.defaultValue;
    }
  }

  function snapshot(panel) {
    const fields = new Map();
    panel.querySelectorAll(FIELDS).forEach(el => fields.set(el, readField(el)));
    const outputs = new Map();
    panel.querySelectorAll(OUTPUTS).forEach(el => {
      if (el.querySelector(`${FIELDS}, button`)) return; // never rebuild a box that holds live controls
      outputs.set(el, { html: el.innerHTML, className: el.className });
    });
    const details = new Map();
    panel.querySelectorAll("details").forEach(el => details.set(el, el.open));
    return { fields, outputs, details };
  }

  function reset(panel, saved) {
    const fields = [...panel.querySelectorAll(FIELDS)];
    fields.forEach(el => writeField(el, saved.fields.get(el)));
    // Let each calculator update its own show/hide logic for the restored values.
    fields.forEach(el => {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    saved.outputs.forEach((state, el) => {
      if (!el.isConnected) return;
      el.innerHTML = state.html;
      el.className = state.className;
    });
    saved.details.forEach((open, el) => { if (el.isConnected) el.open = open; });
    panel.querySelectorAll(".required-missing, .invalid").forEach(el => el.classList.remove("required-missing", "invalid"));
  }

  function install(doc) {
    const d = doc || document;
    const panels = [...d.querySelectorAll(".calc-panel")];
    panels.forEach(panel => {
      if (panel.querySelector(".calc-refresh")) return;
      const back = panel.querySelector(".calc-back");
      const saved = snapshot(panel);
      const button = d.createElement("button");
      button.type = "button";
      button.className = "btn secondary calc-refresh";
      button.textContent = "↺ Refresh";
      button.title = "Clear this calculator";
      button.setAttribute("aria-label", "Refresh: clear this calculator");
      button.addEventListener("click", () => {
        reset(panel, saved);
        button.textContent = "✓ Cleared";
        clearTimeout(button._restoreLabel);
        button._restoreLabel = setTimeout(() => { button.textContent = "↺ Refresh"; }, 1200);
        (panel.querySelector(FIELDS) || button).focus?.({ preventScroll: true });
        panel.scrollIntoView?.({ block: "start" });
      });
      if (back) back.insertAdjacentElement("afterend", button);
      else panel.prepend(button);
    });
    return panels.length;
  }

  if (typeof document !== "undefined") {
    // After every inline script has filled in its starting placeholders.
    const start = () => setTimeout(() => install(document), 0);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }

  return { install, snapshot, reset, localToday };
});
