(() => {
  "use strict";

  if (typeof document === "undefined") return;

  const PREFIXES = ["cl", "dfu"];

  function addStyles() {
    if (document.getElementById("medassistVerticalExamStyles")) return;

    const style = document.createElement("style");
    style.id = "medassistVerticalExamStyles";
    style.textContent = `
      .medassist-exam-vertical-flow{
        display:grid!important;
        grid-template-columns:minmax(0,1fr)!important;
        gap:16px!important;
        align-items:stretch!important;
      }
      .medassist-exam-vertical-flow > *{
        grid-column:1 / -1!important;
        width:100%!important;
        max-width:none!important;
        min-width:0!important;
      }
      .medassist-exam-vertical-flow .tonsil-exam-card,
      .medassist-exam-vertical-flow .cln-exam-span,
      .medassist-exam-vertical-flow .cln-field-wrap{
        width:100%!important;
        max-width:none!important;
        min-width:0!important;
      }
      .medassist-exam-vertical-flow .tonsil-exam-card .grid,
      .medassist-exam-vertical-flow .tonsil-exam-card .tonsil-main-grid,
      .medassist-exam-vertical-flow .tonsil-exam-card .tonsil-detail-grid,
      .medassist-exam-vertical-flow .tonsil-exam-card .tonsil-details-grid,
      .medassist-exam-vertical-flow .cln-field-wrap .grid,
      .medassist-exam-vertical-flow .cln-field-wrap .cln-meta-grid{
        grid-template-columns:minmax(0,1fr)!important;
      }
      .medassist-exam-vertical-flow .tonsil-exam-card select,
      .medassist-exam-vertical-flow .tonsil-exam-card input,
      .medassist-exam-vertical-flow .tonsil-exam-card textarea,
      .medassist-exam-vertical-flow .cln-field-wrap select,
      .medassist-exam-vertical-flow .cln-field-wrap input,
      .medassist-exam-vertical-flow .cln-field-wrap textarea{
        max-width:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function isGridLike(node) {
    if (!node || node === document.body) return false;
    if (node.classList?.contains("grid")) return true;
    const display = getComputedStyle(node).display;
    return display === "grid" || display === "inline-grid";
  }

  function findExamFlow(prefix) {
    const tonsil = document.querySelector(`.tonsil-exam-card[data-tonsil-prefix="${prefix}"]`);
    if (!tonsil) return null;

    // In the current dengue clerking, Throat / Tonsil / Cervical LN share one grid.
    // Prefer that immediate grid so only the examination flow is changed.
    if (isGridLike(tonsil.parentElement)) return tonsil.parentElement;

    let node = tonsil.parentElement;
    while (node && node !== document.body) {
      const hasTonsil = node.querySelector?.(`.tonsil-exam-card[data-tonsil-prefix="${prefix}"]`);
      const hasCervical = node.querySelector?.(`#${prefix}CervicalLN`) || node.querySelector?.(".cln-exam-span");
      if (hasTonsil && hasCervical && isGridLike(node)) return node;
      node = node.parentElement;
    }

    return null;
  }

  function applyVerticalFlow(prefix) {
    const flow = findExamFlow(prefix);
    if (!flow) return;
    flow.classList.add("medassist-exam-vertical-flow");
  }

  function applyAll() {
    PREFIXES.forEach(applyVerticalFlow);
  }

  function init() {
    addStyles();
    applyAll();

    // Optional examination sections can be toggled dynamically, so keep the
    // one-column flow applied whenever those controls update the DOM.
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        applyAll();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("change", event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest?.("[id*='Exam'], [id*='exam'], [id*='System'], [id*='system']") || target.type === "checkbox") {
        setTimeout(applyAll, 0);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
