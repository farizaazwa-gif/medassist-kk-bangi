(() => {
  "use strict";

  if (typeof document === "undefined") return;

  const PREFIXES = ["cl", "dfu"];
  const $ = id => document.getElementById(id);

  const GROUPS = [
    {
      key: "appearance",
      title: "General appearance",
      hint: "Default findings remain normal unless changed.",
      theme: "appearance",
      fields: [
        {
          key: "Mental",
          label: "Mental state",
          options: [
            ["alert", "Alert", "normal"],
            ["restless", "Restless", "critical"],
            ["combative", "Combative", "critical"],
            ["lethargic", "Lethargic", "critical"],
            ["drowsy / confused", "Drowsy / confused", "critical"]
          ]
        },
        {
          key: "Comfort",
          label: "Overall appearance",
          options: [
            ["comfortable", "Comfortable", "normal"],
            ["ill-looking", "Ill-looking", "concern"],
            ["distressed", "Distressed", "concern"]
          ]
        },
        {
          key: "Colour",
          label: "Colour / skin appearance",
          options: [
            ["pink", "Pink", "normal"],
            ["pale", "Pale", "concern"],
            ["cyanosed", "Cyanosed", "critical"],
            ["mottled", "Mottled", "critical"]
          ]
        }
      ]
    },
    {
      key: "perfusion",
      title: "Peripheral perfusion",
      hint: "Amber/red selections are shock-relevant bedside findings in the adult dengue CPG.",
      theme: "perfusion",
      fields: [
        {
          key: "Crt",
          label: "Capillary refill time",
          options: [
            ["crt < 2 sec", "CRT < 2 sec", "normal"],
            ["crt > 2 sec", "CRT > 2 sec", "concern"],
            ["very prolonged crt", "Very prolonged CRT", "critical"]
          ]
        },
        {
          key: "Peripheries",
          label: "Peripheries",
          options: [
            ["warm peripheries", "Warm", "normal"],
            ["cool peripheries", "Cool", "concern"],
            ["cold, clammy peripheries", "Cold & clammy", "critical"]
          ]
        },
        {
          key: "PulseVolume",
          label: "Peripheral pulse volume",
          options: [
            ["good PV", "Good volume", "normal"],
            ["weak & thready PV", "Weak & thready", "concern"],
            ["feeble PV", "Feeble", "critical"],
            ["absent peripheral pulse", "Absent", "critical"]
          ]
        }
      ]
    },
    {
      key: "respiratory",
      title: "Respiratory pattern",
      hint: "Keep the normal default; change only when an abnormal pattern is present.",
      theme: "respiratory",
      fields: [
        {
          key: "Breathing",
          label: "Breathing pattern",
          options: [
            ["not tachypneic", "Not tachypnoeic", "normal"],
            ["tachypneic", "Tachypnoeic", "concern"],
            ["hyperpnoea / Kussmaul breathing", "Hyperpnoea / Kussmaul breathing", "critical"]
          ]
        }
      ]
    }
  ];

  const DEFAULT_ORDER = [
    "Mental",
    "Comfort",
    "Colour",
    "Breathing",
    "Crt",
    "Peripheries",
    "PulseVolume"
  ];

  const DEFAULT_SENTENCE = "alert, comfortable, pink, not tachypneic, crt < 2 sec, warm peripheries, good PV";

  function addStyles() {
    if ($("medassistDengueGeneralExamStyles")) return;

    const style = document.createElement("style");
    style.id = "medassistDengueGeneralExamStyles";
    style.textContent = `
      .medassist-general-exam-shell{
        margin:0 0 14px;
        border:1px solid #d8e6e2;
        border-radius:15px;
        background:#fbfdfc;
        overflow:hidden
      }
      .medassist-general-exam-toolbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:10px 12px;
        border-bottom:1px solid #e3ece9;
        background:#f8fbfa
      }
      .medassist-general-exam-toolbar-copy{min-width:0}
      .medassist-general-exam-toolbar-copy strong{
        display:block;
        color:#294842;
        font-size:12px;
        line-height:1.3
      }
      .medassist-general-exam-toolbar-copy small{
        display:block;
        margin-top:2px;
        color:#71817d;
        font-size:10.5px;
        line-height:1.35
      }
      .medassist-general-exam-toggle{
        width:auto!important;
        min-height:32px!important;
        padding:7px 10px!important;
        border:1px solid #bad9d2!important;
        border-radius:10px!important;
        background:#fff!important;
        color:#176b60!important;
        font-size:11px!important;
        font-weight:800!important;
        white-space:nowrap
      }
      .medassist-general-exam-toggle[data-state="abnormal"]{
        border-color:#dfbd74!important;
        background:#fff8e8!important;
        color:#8a5a00!important
      }
      .medassist-general-exam-panel{
        display:grid;
        gap:10px;
        padding:12px
      }
      .medassist-general-exam-panel[hidden]{display:none!important}
      .medassist-general-exam-group{
        overflow:hidden;
        border:1px solid #dbe6e3;
        border-radius:13px;
        background:#fff
      }
      .medassist-general-exam-group-head{
        padding:9px 11px;
        border-bottom:1px solid #e4ecea
      }
      .medassist-general-exam-group[data-theme="appearance"] .medassist-general-exam-group-head{
        background:#f3f7fb
      }
      .medassist-general-exam-group[data-theme="perfusion"] .medassist-general-exam-group-head{
        background:#f1faf6
      }
      .medassist-general-exam-group[data-theme="respiratory"] .medassist-general-exam-group-head{
        background:#f2f7fd
      }
      .medassist-general-exam-group-head strong{
        display:block;
        color:#29433e;
        font-size:11.5px
      }
      .medassist-general-exam-group-head small{
        display:block;
        margin-top:2px;
        color:#72817d;
        font-size:10px;
        line-height:1.35
      }
      .medassist-general-exam-rows{
        display:grid;
        gap:7px;
        padding:9px
      }
      .medassist-general-exam-row{
        display:grid;
        grid-template-columns:minmax(150px,190px) minmax(0,1fr);
        align-items:center;
        gap:10px;
        min-height:48px;
        padding:7px 9px;
        border:1px solid #e1e9e7;
        border-radius:10px;
        background:#fff;
        transition:.15s ease
      }
      .medassist-general-exam-row[data-state="normal"]{
        border-color:#d6e9dd;
        background:#fbfefc
      }
      .medassist-general-exam-row[data-state="concern"]{
        border-color:#ead29a;
        background:#fffaf0;
        box-shadow:inset 3px 0 0 #d49a29
      }
      .medassist-general-exam-row[data-state="critical"]{
        border-color:#e7b2ad;
        background:#fff4f2;
        box-shadow:inset 3px 0 0 #c95a50
      }
      .medassist-general-exam-label{
        display:flex;
        align-items:center;
        gap:7px;
        min-width:0;
        color:#425b56;
        font-size:11px;
        font-weight:800
      }
      .medassist-general-exam-dot{
        flex:0 0 auto;
        width:7px;
        height:7px;
        border-radius:50%;
        background:#4c9b6c
      }
      .medassist-general-exam-row[data-state="concern"] .medassist-general-exam-dot{background:#d49a29}
      .medassist-general-exam-row[data-state="critical"] .medassist-general-exam-dot{background:#c95a50}
      .medassist-general-exam-row select{
        margin:0!important;
        min-height:36px!important;
        padding:7px 10px!important;
        font-size:11.5px!important
      }
      .medassist-general-exam-legend{
        display:flex;
        flex-wrap:wrap;
        gap:6px 12px;
        padding:0 2px 2px;
        color:#71817d;
        font-size:9.8px
      }
      .medassist-general-exam-legend span{
        display:inline-flex;
        align-items:center;
        gap:5px
      }
      .medassist-general-exam-legend i{
        width:7px;
        height:7px;
        border-radius:50%;
        background:#4c9b6c
      }
      .medassist-general-exam-legend .concern i{background:#d49a29}
      .medassist-general-exam-legend .critical i{background:#c95a50}

      .medassist-pe-normal-banner[data-general-exam-state="concern"]{
        border-color:#ebcf8b!important;
        background:#fff8e8!important;
        color:#76510b!important
      }
      .medassist-pe-normal-banner[data-general-exam-state="concern"]::before{
        content:"!"!important;
        background:#d49322!important
      }
      .medassist-pe-normal-banner[data-general-exam-state="critical"]{
        border-color:#e7b2ad!important;
        background:#fff2f0!important;
        color:#8b312a!important
      }
      .medassist-pe-normal-banner[data-general-exam-state="critical"]::before{
        content:"!"!important;
        background:#c75148!important
      }

      @media(max-width:700px){
        .medassist-general-exam-toolbar{align-items:flex-start;flex-direction:column}
        .medassist-general-exam-row{grid-template-columns:1fr;gap:6px}
        .medassist-general-exam-toggle{width:100%!important}
      }
    `;
    document.head.appendChild(style);
  }

  function getField(prefix, key) {
    return $(`${prefix}General${key}`);
  }

  function fieldState(select) {
    return select?.selectedOptions?.[0]?.dataset?.state || "normal";
  }

  function highestState(prefix) {
    let state = "normal";
    GROUPS.forEach(group => group.fields.forEach(field => {
      const current = fieldState(getField(prefix, field.key));
      if (current === "critical") state = "critical";
      else if (current === "concern" && state === "normal") state = "concern";
    }));
    return state;
  }

  function abnormalCount(prefix) {
    let count = 0;
    GROUPS.forEach(group => group.fields.forEach(field => {
      if (fieldState(getField(prefix, field.key)) !== "normal") count += 1;
    }));
    return count;
  }

  function currentSentence(prefix) {
    const values = Object.fromEntries(DEFAULT_ORDER.map(key => [
      key,
      getField(prefix, key)?.value || ""
    ]));
    return DEFAULT_ORDER.map(key => values[key]).filter(Boolean).join(", ");
  }

  function updateBanner(prefix) {
    const shell = $(`${prefix}GeneralExamOptions`);
    if (!shell) return;
    const card = shell.closest(".card");
    const banner = card?.querySelector(".medassist-pe-normal-banner, .normal-box");
    if (!banner) return;

    const state = highestState(prefix);
    const sentence = currentSentence(prefix) || DEFAULT_SENTENCE;
    banner.textContent = `O/e: ${sentence}`;
    banner.dataset.generalExamState = state;

    const toggle = $(`${prefix}GeneralExamToggle`);
    const count = abnormalCount(prefix);
    if (toggle) {
      toggle.dataset.state = count ? "abnormal" : "normal";
      toggle.textContent = count
        ? `Edit abnormal O/E (${count})`
        : "Change general O/E";
    }
  }

  function updateRows(prefix) {
    GROUPS.forEach(group => group.fields.forEach(field => {
      const select = getField(prefix, field.key);
      const row = select?.closest(".medassist-general-exam-row");
      if (row) row.dataset.state = fieldState(select);
    }));
  }

  function updateAll(prefix) {
    updateRows(prefix);
    updateBanner(prefix);

    document.dispatchEvent(new CustomEvent("medassist:dengue-general-exam-change", {
      detail: { prefix }
    }));
  }

  function makeSelect(prefix, field) {
    const select = document.createElement("select");
    select.id = `${prefix}General${field.key}`;
    select.setAttribute("aria-label", field.label);

    field.options.forEach(([value, label, state], index) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.dataset.state = state;
      if (index === 0) option.selected = true;
      select.appendChild(option);
    });
    return select;
  }

  function makeGroup(prefix, group) {
    const wrapper = document.createElement("section");
    wrapper.className = "medassist-general-exam-group";
    wrapper.dataset.theme = group.theme;

    const head = document.createElement("div");
    head.className = "medassist-general-exam-group-head";
    head.innerHTML = `<strong>${group.title}</strong><small>${group.hint}</small>`;
    wrapper.appendChild(head);

    const rows = document.createElement("div");
    rows.className = "medassist-general-exam-rows";

    group.fields.forEach(field => {
      const row = document.createElement("div");
      row.className = "medassist-general-exam-row";
      row.dataset.state = "normal";

      const label = document.createElement("div");
      label.className = "medassist-general-exam-label";
      label.innerHTML = `<span class="medassist-general-exam-dot"></span><span>${field.label}</span>`;

      const select = makeSelect(prefix, field);
      select.addEventListener("change", () => updateAll(prefix));

      row.append(label, select);
      rows.appendChild(row);
    });

    wrapper.appendChild(rows);
    return wrapper;
  }

  function findExamCard(prefix) {
    return $(`${prefix}GCS`)?.closest(".card")
      || document.querySelector(`.tonsil-exam-card[data-tonsil-prefix="${prefix}"]`)?.closest(".card")
      || null;
  }

  function addPanel(prefix) {
    if ($(`${prefix}GeneralExamOptions`)) return true;

    const card = findExamCard(prefix);
    if (!card) return false;

    const banner = card.querySelector(".medassist-pe-normal-banner, .normal-box");
    if (!banner) return false;

    const shell = document.createElement("div");
    shell.className = "medassist-general-exam-shell";
    shell.id = `${prefix}GeneralExamOptions`;

    const toolbar = document.createElement("div");
    toolbar.className = "medassist-general-exam-toolbar";
    toolbar.innerHTML = `
      <div class="medassist-general-exam-toolbar-copy">
        <strong>General O/E findings</strong>
        <small>The green sentence above is the default. Open this only when a finding is different.</small>
      </div>
    `;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "medassist-general-exam-toggle";
    toggle.id = `${prefix}GeneralExamToggle`;
    toggle.textContent = "Change general O/E";
    toggle.setAttribute("aria-expanded", "false");

    const panel = document.createElement("div");
    panel.className = "medassist-general-exam-panel";
    panel.id = `${prefix}GeneralExamPanel`;
    panel.hidden = true;

    GROUPS.forEach(group => panel.appendChild(makeGroup(prefix, group)));

    const legend = document.createElement("div");
    legend.className = "medassist-general-exam-legend";
    legend.innerHTML = `
      <span><i></i>Default / normal</span>
      <span class="concern"><i></i>Abnormal / shock-relevant</span>
      <span class="critical"><i></i>Critical shock-compatible feature</span>
    `;
    panel.appendChild(legend);

    toggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
    });

    toolbar.appendChild(toggle);
    shell.append(toolbar, panel);
    banner.insertAdjacentElement("afterend", shell);

    updateAll(prefix);
    return true;
  }

  function replaceGeneralLine(text, prefix) {
    if (!text) return text;
    const sentence = currentSentence(prefix) || DEFAULT_SENTENCE;

    const defaultPattern = /^\s*alert,\s*comfortable,\s*pink,\s*not tachypneic,\s*crt\s*<\s*2\s*sec,\s*warm peripheries,\s*good PV\s*$/im;
    if (defaultPattern.test(text)) {
      return text.replace(defaultPattern, sentence);
    }

    const lines = text.split("\n");
    const oeIndex = lines.findIndex(line => /^\s*o\/e\s*:\s*$/i.test(line));
    if (oeIndex >= 0 && oeIndex + 1 < lines.length) {
      const next = lines[oeIndex + 1];
      if (/alert|comfortable|crt|peripher|PV|tachyp/i.test(next)) {
        lines[oeIndex + 1] = sentence;
        return lines.join("\n");
      }
    }
    return text;
  }

  function rewriteOutputs(prefix) {
    const root = document.querySelector(`#page-${prefix}`) || document;
    root.querySelectorAll("textarea").forEach(area => {
      if (!area.value || !/o\/e\s*:|alert,\s*comfortable,\s*pink/i.test(area.value)) return;
      const updated = replaceGeneralLine(area.value, prefix);
      if (updated !== area.value) area.value = updated;
    });
  }

  function bindOutputHooks(prefix) {
    const generate = $(`${prefix}Generate`);
    if (generate && !generate.dataset.generalExamOutputBound) {
      generate.dataset.generalExamOutputBound = "true";
      generate.addEventListener("click", () => {
        window.setTimeout(() => rewriteOutputs(prefix), 0);
        window.setTimeout(() => rewriteOutputs(prefix), 90);
      });
    }

    const copy = $(`${prefix}Copy`);
    if (copy && !copy.dataset.generalExamOutputBound) {
      copy.dataset.generalExamOutputBound = "true";
      copy.addEventListener("click", () => rewriteOutputs(prefix), true);
    }
  }

  function reset(prefix) {
    GROUPS.forEach(group => group.fields.forEach(field => {
      const select = getField(prefix, field.key);
      if (select) select.selectedIndex = 0;
    }));
    const panel = $(`${prefix}GeneralExamPanel`);
    const toggle = $(`${prefix}GeneralExamToggle`);
    if (panel) panel.hidden = true;
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    updateAll(prefix);
  }

  function bindReset(prefix) {
    const button = $(`${prefix}Reset`);
    if (!button || button.dataset.generalExamResetBound) return;
    button.dataset.generalExamResetBound = "true";
    button.addEventListener("click", () => window.setTimeout(() => reset(prefix), 20));
  }

  function ensureAll() {
    PREFIXES.forEach(prefix => {
      addPanel(prefix);
      bindOutputHooks(prefix);
      bindReset(prefix);
    });
  }

  function init() {
    addStyles();
    ensureAll();

    const observer = new MutationObserver(() => ensureAll());
    observer.observe(document.body, { childList: true, subtree: true });

    [80, 250, 700].forEach(delay => window.setTimeout(ensureAll, delay));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
