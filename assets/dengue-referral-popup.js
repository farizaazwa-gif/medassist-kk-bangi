/* Dengue referral / category pop-up (v18.247).
 * Adults: Adult Dengue CPG Fourth Edition (2026), Table 6 groups A / B1 / B2 / C, taken from the
 * existing CPG4 engine (MedAssistDengueCpg4UI.referral). Hospital referral = the engine's needsHospital.
 * Children: the app's paediatric referral criteria (CPG Management of Dengue in Children 2020).
 * No A/B1/B2/C grouping is implemented for children, so none is shown.
 * A pop-up shows once per change of referral status / category and can be closed. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MedAssistDengueReferralPopup = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const GROUPS = ["A", "B1", "B2", "C"];
  const ADULT_SOURCE = "Adult Dengue CPG Fourth Edition (2026), Table 6. Clinician confirms the assessment and disposition.";
  const PAEDS_SOURCE = "CPG Management of Dengue in Children, 2nd Edition (2020): admission / referral criteria. Clinician confirms the assessment and disposition.";

  /* Turn an engine assessment into what the pop-up shows. */
  function view(a, adult) {
    if (!a || a.enabled === false) return null;
    if (adult) {
      const grouped = GROUPS.includes(a.group);
      return {
        adult: true,
        referral: Boolean(a.needsHospital),
        urgent: a.level === "red" || a.group === "C",
        category: grouped ? a.group : "",
        categoryLabel: grouped ? `Group ${a.group}` : "Not yet grouped",
        categoryDetail: grouped
          ? String(a.title || "").replace(/^Group [A-C]\d?(?: candidate)?\s*—\s*/, "")
          : "Reassess before grouping",
        reasons: (a.reasons || []).slice(0, 8),
        source: ADULT_SOURCE
      };
    }
    const referral = a.level === "red" || a.level === "amber";
    return {
      adult: false,
      referral,
      urgent: a.level === "red",
      category: "",
      categoryLabel: "Paediatric dengue",
      categoryDetail: referral ? "Hospital admission / referral criteria met" : "",
      reasons: (a.reasons || []).slice(0, 8),
      source: PAEDS_SOURCE
    };
  }

  /* Show once per change. Referral always qualifies; a category without referral only when the
   * diagnosis is complete. "Not yet grouped" without referral never pops up. */
  function decide(v, shownKey, ready) {
    if (!v) return { action: "none", key: shownKey };
    if (v.referral) {
      const key = `R|${v.category}|${v.urgent ? "urgent" : ""}`;
      return { action: key === shownKey ? "none" : "referral", key };
    }
    if (ready && v.category) {
      const key = `C|${v.category}`;
      return { action: key === shownKey ? "none" : "category", key };
    }
    return { action: "none", key: shownKey };
  }

  function categoryLine(v, ready) {
    if (!v) return "";
    if (v.adult && (v.referral || ready)) return `Category: ${v.categoryLabel} — ${v.categoryDetail}${v.referral ? " · needs hospital referral" : ""}`;
    if (!v.adult && v.referral) return "Hospital referral criteria met (CPG Dengue in Children 2020)";
    return "";
  }

  /* ---------------- DOM ---------------- */
  if (typeof document === "undefined") return { view, decide, categoryLine };

  const shown = { new: "", followup: "" };
  let popupMode = "";

  const byId = id => document.getElementById(id);
  const prefixOf = mode => (mode === "followup" ? "dfu" : "cl");
  const templateOf = mode => byId(mode === "followup" ? "dengueFollowUpTemplate" : "dengueNewCaseTemplate");

  function visible(mode) {
    const template = templateOf(mode);
    return Boolean(byId("page-clerking")?.classList.contains("active") && template && !template.classList.contains("hidden"));
  }

  function ensurePopup() {
    let popup = byId("denguePopup");
    if (popup) return popup;
    popup = document.createElement("div");
    popup.id = "denguePopup";
    popup.className = "dengue-popup-dock hidden";
    popup.innerHTML = `
      <div class="dengue-popup" role="alert" aria-labelledby="denguePopupTitle">
        <div class="dengue-popup-head">
          <strong id="denguePopupTitle"></strong>
          <button class="dengue-popup-x" type="button" data-popup-close aria-label="Close">✕</button>
        </div>
        <div class="dengue-popup-label">Patient category</div>
        <div class="dengue-popup-category">
          <span class="dengue-popup-badge" id="denguePopupBadge"></span>
          <div><b id="denguePopupGroup"></b><small id="denguePopupGroupDetail"></small></div>
        </div>
        <ul class="dengue-popup-reasons" id="denguePopupReasons"></ul>
        <p class="dengue-popup-source" id="denguePopupSource"></p>
        <div class="dengue-popup-actions">
          <button class="btn danger" type="button" id="denguePopupRefer">Set plan to Refer ED</button>
          <button class="btn secondary" type="button" data-popup-close>Close</button>
        </div>
      </div>`;
    document.body.appendChild(popup);
    popup.addEventListener("click", event => {
      if (event.target.closest("[data-popup-close]")) close();
    });
    byId("denguePopupRefer").addEventListener("click", () => {
      if (popupMode) window.setDengueReferralPlan?.(popupMode);
      close();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !popup.classList.contains("hidden")) close();
    });
    return popup;
  }

  function open(mode, v, kind) {
    const popup = ensurePopup();
    popupMode = mode;
    const referral = kind === "referral";
    popup.classList.toggle("referral", referral);
    popup.classList.toggle("urgent", referral && v.urgent);
    byId("denguePopupTitle").textContent = referral ? "Needs urgent referral" : "Dengue category";
    byId("denguePopupBadge").textContent = v.category || (v.adult ? "?" : "!");
    byId("denguePopupGroup").textContent = v.categoryLabel;
    byId("denguePopupGroupDetail").textContent = v.categoryDetail ? v.categoryDetail.charAt(0).toUpperCase() + v.categoryDetail.slice(1) : "";
    const list = byId("denguePopupReasons");
    list.textContent = "";
    (referral ? v.reasons : []).forEach(reason => {
      const item = document.createElement("li");
      item.textContent = reason;
      list.appendChild(item);
    });
    list.classList.toggle("hidden", !list.children.length);
    byId("denguePopupSource").textContent = v.source;
    const plan = byId(`${prefixOf(mode)}PlanOption`);
    byId("denguePopupRefer").classList.toggle("hidden", !referral || plan?.value === "refer");
    // Non-blocking notification at the top right: the clinician keeps typing; focus is not moved.
    popup.classList.remove("hidden", "enter");
    void popup.offsetWidth;
    popup.classList.add("enter");
  }

  function close() {
    const popup = byId("denguePopup");
    if (!popup || popup.classList.contains("hidden")) return;
    popup.classList.add("hidden");
    popupMode = "";
  }

  function ensureLine(p) {
    let line = byId(`${p}CategoryLine`);
    if (line) return line;
    const dx = byId(`${p}GeneratedDx`);
    if (!dx) return null;
    line = document.createElement("div");
    line.id = `${p}CategoryLine`;
    line.className = "dengue-category-line hidden";
    dx.insertAdjacentElement("afterend", line);
    return line;
  }

  function assessmentFor(mode) {
    const p = prefixOf(mode);
    const adult = (byId(mode === "followup" ? "dfuGroup" : "dfGroup")?.value || "adult") === "adult";
    if (adult) {
      const ui = window.MedAssistDengueCpg4UI;
      if (!ui || !ui.active(p)) return { v: null, ready: false };
      const ready = !/^Diagnosis pending/.test(ui.diagnosis(p) || "Diagnosis pending");
      return { v: view(ui.referral(p), true), ready };
    }
    if (typeof window.dengueReferralAssessment !== "function") return { v: null, ready: false };
    return { v: view(window.dengueReferralAssessment(mode), false), ready: false };
  }

  function render(mode) {
    if (mode !== "new" && mode !== "followup") return;
    const p = prefixOf(mode);
    const { v, ready } = assessmentFor(mode);
    const line = ensureLine(p);
    if (line) {
      const text = categoryLine(v, ready);
      line.textContent = text;
      line.classList.toggle("hidden", !text);
      line.classList.toggle("referral", Boolean(v && v.referral));
    }
    if (!visible(mode)) return;
    const decision = decide(v, shown[mode], ready);
    shown[mode] = decision.key;
    if (decision.action !== "none") open(mode, v, decision.action);
  }

  function resetMode(mode) {
    shown[mode] = "";
    if (popupMode === mode) close();
  }

  document.addEventListener("click", event => {
    const reset = event.target?.closest?.("#clReset,#dfuReset");
    if (!reset) return;
    const mode = reset.id === "dfuReset" ? "followup" : "new";
    setTimeout(() => { resetMode(mode); render(mode); }, 150);
  }, true);

  return { view, decide, categoryLine, render, close, resetMode };
});
