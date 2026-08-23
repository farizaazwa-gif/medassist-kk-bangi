(() => {
  "use strict";

  if (typeof document === "undefined") return;

  const executingScript = document.currentScript;
  const assetBase = executingScript?.src
    ? new URL(".", executingScript.src)
    : new URL("assets/", document.baseURI);
  const tonsilGuideImage = new URL("tonsil-grading-guide.webp", assetBase).href;

  const $ = id => document.getElementById(id);
  const value = id => String($(id)?.value ?? "").trim();

  function addStyles() {
    if ($("medassistTonsilCentorStyles")) return;
    const style = document.createElement("style");
    style.id = "medassistTonsilCentorStyles";
    style.textContent = `
      .tonsil-guide-trigger-wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px}
      .tonsil-guide-trigger-wrap .tonsil-title{margin:0}
      .tonsil-guide-overlay{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.58);display:flex;align-items:center;justify-content:center;padding:20px}
      .tonsil-guide-overlay[hidden]{display:none!important}
      .tonsil-guide-modal{width:min(860px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.28);padding:18px}
      .tonsil-guide-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}
      .tonsil-guide-head h3{margin:0 0 4px;font-size:18px}
      .tonsil-guide-head p{margin:0;color:#5b6472;font-size:13px}
      .tonsil-guide-figure{display:block;width:100%;height:auto;max-height:68vh;object-fit:contain;border:1px solid #e5e7eb;border-radius:14px;background:#fff}
      .tonsil-guide-caption{margin-top:10px;color:#5b6472;font-size:12px;line-height:1.45}
      .auto-centor-card{margin-top:14px;padding:13px 14px;border:1px solid #d7e4df;border-radius:14px;background:#f8fbfa}
      .auto-centor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:7px}
      .auto-centor-head strong{font-size:13px;color:#173f38}
      .auto-centor-head small{display:block;margin-top:2px;color:#65736f;font-size:11px;line-height:1.35}
      .auto-centor-temp-q{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 11px;border-radius:11px;background:#fff;border:1px solid #e2e8e5}
      .auto-centor-temp-q span{font-size:13px;font-weight:700;color:#243b36}
      .auto-centor-temp-actions{display:flex;gap:7px}
      .auto-centor-temp-actions button{width:auto!important;min-width:64px;padding:7px 11px!important;min-height:auto!important;font-size:12px!important}
      .auto-centor-temp-actions button.is-selected{outline:2px solid #236b5a;outline-offset:1px}
      .auto-centor-result{margin-top:10px;padding:10px 11px;border-radius:11px;background:#fff;border:1px solid #e2e8e5;font-size:12px;line-height:1.48;color:#33413e}
      .auto-centor-score{font-size:18px;font-weight:800;color:#173f38}
      .auto-centor-breakdown{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 12px;margin-top:8px;color:#52615d}
      .auto-centor-breakdown span{font-size:11px}
      .auto-centor-note{margin-top:8px;color:#6b7280;font-size:10.5px;line-height:1.4}
      @media(max-width:640px){
        .tonsil-guide-overlay{padding:10px}
        .tonsil-guide-modal{padding:14px;border-radius:14px}
        .tonsil-guide-head{flex-direction:column}
        .auto-centor-breakdown{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureGuideModal() {
    let overlay = $("tonsilGuideOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "tonsilGuideOverlay";
    overlay.className = "tonsil-guide-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="tonsil-guide-modal" role="dialog" aria-modal="true" aria-labelledby="tonsilGuideTitle">
        <div class="tonsil-guide-head">
          <div>
            <h3 id="tonsilGuideTitle">Tonsil grading — anatomical guide</h3>
            <p>Open only when needed while grading tonsillar enlargement.</p>
          </div>
          <button class="btn secondary" id="tonsilGuideClose" type="button">Close</button>
        </div>
        <img class="tonsil-guide-figure" src="${tonsilGuideImage}" alt="Tonsil grading anatomical guide showing grades 0 to 4" />
        <div class="tonsil-guide-caption">Grade 0: within tonsillar fossa · Grade 1: &lt;25% · Grade 2: &lt;50% · Grade 3: &lt;75% · Grade 4: &gt;75% of the space between the pillars.</div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.hidden = true;
      document.body.style.removeProperty("overflow");
    };
    const open = () => {
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
      $("tonsilGuideClose")?.focus();
    };

    $("tonsilGuideClose")?.addEventListener("click", close);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !overlay.hidden) close();
    });
    overlay.openGuide = open;
    return overlay;
  }

  function addGuideButton(prefix) {
    const card = document.querySelector(`.tonsil-exam-card[data-tonsil-prefix="${prefix}"]`);
    if (!card || card.querySelector("[data-tonsil-guide-open]")) return;

    const title = card.querySelector(".tonsil-title");
    if (!title) return;

    const row = document.createElement("div");
    row.className = "tonsil-guide-trigger-wrap";
    title.parentNode.insertBefore(row, title);
    row.appendChild(title);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn secondary inline-guide-btn";
    button.dataset.tonsilGuideOpen = "true";
    button.textContent = "Anatomical guide";
    button.addEventListener("click", () => ensureGuideModal().openGuide?.());
    row.appendChild(button);
  }

  function findCoughControl(prefix) {
    const ids = prefix === "cl"
      ? ["clSymCough", "clCough", "clSxCough"]
      : ["dfuSymCough", "dfuCough", "dfuSxCough"];
    return ids.map(id => $(id)).find(Boolean) || null;
  }

  function getTemperature(prefix) {
    const candidateIds = [
      `${prefix}Temp`,
      `${prefix}Temperature`,
      `${prefix}VitalTemp`,
      `${prefix}VitalTemperature`
    ];
    for (const id of candidateIds) {
      const raw = value(id);
      if (!raw) continue;
      const temp = Number(raw);
      if (Number.isFinite(temp)) return { known: true, above38: temp > 38, temp, source: "vital" };
    }
    return { known: false };
  }

  function getAgeYears(prefix) {
    const raw = Number(value(`${prefix}Age`));
    if (!Number.isFinite(raw) || raw < 0 || value(`${prefix}Age`) === "") return null;
    return value(`${prefix}AgeUnit`) === "months" ? raw / 12 : raw;
  }

  function getTonsilPoint(prefix) {
    return value(`${prefix}Tonsil`) === "enlarged" || value(`${prefix}TonsilExudate`) === "exudative";
  }

  function getNodePoint(prefix) {
    if (value(`${prefix}CervicalLN`) !== "palpable") return false;
    if (value(`${prefix}CervicalLNTenderness`) !== "tender") return false;

    const sites = [...document.querySelectorAll(`#${prefix}CervicalLNSites input[type="checkbox"]:checked`)]
      .map(input => input.value);
    if (!sites.length) return true;

    const anteriorSites = new Set(["Tonsillar", "Superficial cervical", "Deep cervical"]);
    return sites.some(site => anteriorSites.has(site));
  }

  function ageAdjustment(ageYears) {
    if (ageYears === null) return null;
    if (ageYears < 3) return null;
    if (ageYears <= 14) return 1;
    if (ageYears >= 45) return -1;
    return 0;
  }

  function interpretation(score) {
    if (score <= 0) return "Very low likelihood of GAS; routine testing is generally not required unless clinical concern overrides.";
    if (score === 1) return "Low likelihood of GAS; consider no testing unless clinical concern or local protocol indicates otherwise.";
    if (score <= 3) return "Intermediate likelihood of GAS; consider RADT and/or throat culture according to the local pathway.";
    return "Higher likelihood of GAS; perform microbiological testing where available and manage according to the local sore-throat guideline.";
  }

  function renderCentor(prefix) {
    const box = document.querySelector(`.auto-centor-card[data-centor-prefix="${prefix}"]`);
    if (!box) return;

    const cough = findCoughControl(prefix);
    if (!cough) {
      box.hidden = true;
      return;
    }
    box.hidden = false;

    const ageYears = getAgeYears(prefix);
    const ageAdj = ageAdjustment(ageYears);
    if (ageYears !== null && ageYears < 3) {
      box.innerHTML = `
        <div class="auto-centor-head"><div><strong>Modified Centor score</strong><small>Auto-derived from the current clerking.</small></div></div>
        <div class="auto-centor-result"><strong>Not generated for age &lt;3 years.</strong><div class="auto-centor-note">The integrated Modified Centor tool is limited to the same age range used by the existing calculator.</div></div>`;
      return;
    }

    if (ageAdj === null) {
      box.innerHTML = `
        <div class="auto-centor-head"><div><strong>Modified Centor score</strong><small>Auto-derived from the current clerking.</small></div></div>
        <div class="auto-centor-result">Enter the patient's age first to calculate the age-adjusted score.</div>`;
      return;
    }

    const measuredTemp = getTemperature(prefix);
    const manualTemp = box.dataset.tempAbove38 || "";
    const tempKnown = measuredTemp.known || manualTemp === "yes" || manualTemp === "no";
    const tempAbove38 = measuredTemp.known ? measuredTemp.above38 : manualTemp === "yes";

    const tempPrompt = measuredTemp.known
      ? `<div class="auto-centor-temp-q"><span>Temp &gt;38°C?</span><div class="helper">Auto: ${measuredTemp.temp.toFixed(1)}°C → ${measuredTemp.above38 ? "Yes" : "No"}</div></div>`
      : `<div class="auto-centor-temp-q"><span>Temp &gt;38°C ?</span><div class="auto-centor-temp-actions"><button type="button" class="btn secondary ${manualTemp === "yes" ? "is-selected" : ""}" data-centor-temp="yes">Yes</button><button type="button" class="btn secondary ${manualTemp === "no" ? "is-selected" : ""}" data-centor-temp="no">No</button></div></div>`;

    if (!tempKnown) {
      box.innerHTML = `
        <div class="auto-centor-head"><div><strong>Modified Centor score</strong><small>Other criteria are read automatically from cough, tonsil, cervical LN and age.</small></div></div>
        ${tempPrompt}
        <div class="auto-centor-note">Temperature is not assumed when it has not been entered.</div>`;
      bindTempButtons(box, prefix);
      return;
    }

    const tonsil = getTonsilPoint(prefix);
    const nodes = getNodePoint(prefix);
    const noCough = !cough.checked;
    const score = Number(tonsil) + Number(nodes) + Number(tempAbove38) + Number(noCough) + ageAdj;

    const ageLabel = ageAdj > 0 ? `+${ageAdj}` : String(ageAdj);
    box.innerHTML = `
      <div class="auto-centor-head"><div><strong>Modified Centor score</strong><small>Auto-calculated from the current clerking.</small></div><div class="auto-centor-score">${score}</div></div>
      ${tempPrompt}
      <div class="auto-centor-result">
        <strong>${interpretation(score)}</strong>
        <div class="auto-centor-breakdown">
          <span>Tonsillar exudate / swelling: <b>${tonsil ? "+1" : "0"}</b></span>
          <span>Tender anterior cervical LN: <b>${nodes ? "+1" : "0"}</b></span>
          <span>Temp &gt;38°C: <b>${tempAbove38 ? "+1" : "0"}</b></span>
          <span>Absence of cough: <b>${noCough ? "+1" : "0"}</b></span>
          <span>Age adjustment: <b>${ageLabel}</b></span>
        </div>
        <div class="auto-centor-note">Supports GAS pharyngitis assessment only; it does not confirm the diagnosis or mandate antibiotics. If tender cervical nodes are site-specified, the point is awarded only for tonsillar / superficial cervical / deep cervical sites.</div>
      </div>`;
    bindTempButtons(box, prefix);
  }

  function bindTempButtons(box, prefix) {
    box.querySelectorAll("[data-centor-temp]").forEach(button => {
      button.addEventListener("click", () => {
        box.dataset.tempAbove38 = button.dataset.centorTemp;
        renderCentor(prefix);
      });
    });
  }

  function addCentor(prefix) {
    const card = document.querySelector(`.tonsil-exam-card[data-tonsil-prefix="${prefix}"]`);
    if (!card || card.querySelector(`.auto-centor-card[data-centor-prefix="${prefix}"]`)) return;
    if (!findCoughControl(prefix)) return;

    const box = document.createElement("div");
    box.className = "auto-centor-card";
    box.dataset.centorPrefix = prefix;
    card.appendChild(box);
    renderCentor(prefix);
  }

  function relevantForPrefix(target, prefix) {
    if (!target || !(target instanceof Element)) return false;
    const id = target.id || "";
    if (id.startsWith(prefix)) return true;
    return Boolean(target.closest?.(`#${prefix}CervicalLNSites`));
  }

  function init() {
    addStyles();
    ensureGuideModal();
    ["cl", "dfu"].forEach(addGuideButton);
    ["cl", "dfu"].forEach(addCentor);

    document.addEventListener("change", event => {
      ["cl", "dfu"].forEach(prefix => {
        if (relevantForPrefix(event.target, prefix)) renderCentor(prefix);
      });
    });
    document.addEventListener("input", event => {
      ["cl", "dfu"].forEach(prefix => {
        if (relevantForPrefix(event.target, prefix)) renderCentor(prefix);
      });
    });

    ["cl", "dfu"].forEach(prefix => {
      $(`${prefix}Reset`)?.addEventListener("click", () => {
        setTimeout(() => {
          const box = document.querySelector(`.auto-centor-card[data-centor-prefix="${prefix}"]`);
          if (box) delete box.dataset.tempAbove38;
          renderCentor(prefix);
        }, 0);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
