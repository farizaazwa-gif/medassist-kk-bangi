(() => {
  "use strict";

  if (typeof document === "undefined") return;

  const STYLE_ID = "medassistDisableDengueVitalInterpretation";
  const PREFIXES = ["cl", "dfu"];

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #clVitalShockResult,
      #dfuVitalShockResult{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function hideInterpretationBoxes() {
    PREFIXES.forEach(prefix => {
      const box = document.getElementById(`${prefix}VitalShockResult`);
      if (!box) return;
      box.hidden = true;
      box.setAttribute("aria-hidden", "true");
      box.dataset.autoInterpretation = "disabled";
    });
  }

  function neutralAssessment(mode) {
    let vital = {};
    try {
      if (typeof window.dengueParseVitalSigns === "function") {
        vital = window.dengueParseVitalSigns(mode) || {};
      }
    } catch (_) {
      vital = {};
    }

    return {
      category: "disabled",
      label: "",
      detail: "",
      referral: false,
      urgent: false,
      vital
    };
  }

  function installClinicalJudgementMode() {
    addStyles();
    hideInterpretationBoxes();

    // Do not infer shock / compensated shock or trigger referral from pasted
    // vital signs alone. Haemodynamic status remains a clinician-entered judgement.
    window.dengueVitalShockAssessment = neutralAssessment;
    window.renderDengueVitalShockResult = function renderDengueVitalShockResultDisabled(mode) {
      hideInterpretationBoxes();
      return neutralAssessment(mode);
    };

    // Existing clerking scripts can touch this area after input/reset events.
    // Keep only the raw vital-sign entry visible.
    document.addEventListener("input", hideInterpretationBoxes, true);
    document.addEventListener("change", hideInterpretationBoxes, true);
    document.addEventListener("medassist:dengue-general-exam-change", hideInterpretationBoxes);

    const observer = new MutationObserver(hideInterpretationBoxes);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installClinicalJudgementMode, { once: true });
  } else {
    installClinicalJudgementMode();
  }
})();
