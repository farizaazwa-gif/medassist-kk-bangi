(() => {
  "use strict";

  if (typeof document === "undefined") return;

  const VALUE = "loose stool 3 or more/day";
  const INPUT_ID = "clDxLooseStoolWarning";

  function rebuildDiagnosis() {
    if (typeof window.buildDiagnosis === "function") {
      window.buildDiagnosis();
    }
  }

  function addLooseStoolWarningOption() {
    const grid = document.getElementById("clWarningSigns");
    if (!grid) return false;

    const existing = [...grid.querySelectorAll('input[type="checkbox"]')]
      .find(input => input.value === VALUE || input.id === INPUT_ID);
    if (existing) return true;

    const label = document.createElement("label");
    label.className = "check-item red";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = INPUT_ID;
    input.value = VALUE;
    input.addEventListener("change", rebuildDiagnosis);

    label.appendChild(input);
    label.appendChild(document.createTextNode("Loose stool 3 or more/day"));
    grid.appendChild(label);
    return true;
  }

  function init() {
    if (addLooseStoolWarningOption()) return;

    const observer = new MutationObserver(() => {
      if (addLooseStoolWarningOption()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
