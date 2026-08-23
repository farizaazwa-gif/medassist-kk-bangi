(() => {
  "use strict";

  if (typeof document === "undefined") return;

  const DENGUE_PREFIXES = ["cl", "dfu"];
  const byId = id => document.getElementById(id);
  const fieldValue = id => String(byId(id)?.value ?? "").trim();
  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function addStyles() {
    if (byId("medassistPhysicalExamStyles")) return;

    const style = create("style");
    style.id = "medassistPhysicalExamStyles";
    style.textContent = `
      :root{
        --pe-ink:#183a35;
        --pe-muted:#647873;
        --pe-border:#d7e5e1;
        --pe-shadow:0 10px 30px rgba(25,78,69,.07);
        --pe-aqua:#168b83;
        --pe-aqua-tint:#edf9f7;
        --pe-lilac:#7567c8;
        --pe-lilac-tint:#f5f2ff;
        --pe-blue:#397bc2;
        --pe-blue-tint:#eef6ff;
        --pe-sand:#b47a16;
        --pe-sand-tint:#fff8e9;
        --pe-slate:#68757b;
        --pe-slate-tint:#f3f6f7;
        --pe-green:#347b59;
        --pe-green-tint:#eef8f1;
        --pe-normal-bg:#eaf7ee;
        --pe-normal-fg:#17663c;
        --pe-normal-border:#c5e6d0;
        --pe-abnormal-bg:#fff4dc;
        --pe-abnormal-fg:#835500;
        --pe-abnormal-border:#efd396;
        --pe-empty-bg:#f0f3f4;
        --pe-empty-fg:#66757a;
        --pe-empty-border:#d9e0e2;
      }

      .medassist-pe-card{
        position:relative;
        overflow:hidden;
        border-color:#d2e2de!important;
        box-shadow:var(--pe-shadow);
        background:#fff!important;
      }
      .medassist-pe-titlebar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        min-height:72px;
        margin:-20px -20px 18px;
        padding:15px 20px;
        border-bottom:1px solid #d8e6e2;
        background:#f4faf8;
      }
      .medassist-pe-title-main{
        display:flex;
        align-items:center;
        gap:12px;
        min-width:0;
      }
      .medassist-pe-title-icon{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex:0 0 auto;
        width:38px;
        height:38px;
        border:1px solid #b9dcd4;
        border-radius:12px;
        background:#fff;
        color:#176b60;
        font-size:16px;
        font-weight:900;
        letter-spacing:-.02em;
        box-shadow:0 4px 12px rgba(23,107,96,.08);
      }
      .medassist-pe-title-copy{min-width:0}
      .medassist-pe-title-copy h2,
      .medassist-pe-title-copy .nnj-card-title h2{
        margin:0!important;
        color:#173f38;
        font-size:20px!important;
        line-height:1.2;
      }
      .medassist-pe-title-copy small{
        display:block;
        margin-top:4px;
        color:#61756f;
        font-size:11px;
        line-height:1.35;
      }
      .medassist-pe-title-copy .nnj-card-title{margin:0}
      .medassist-pe-title-summary{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex:0 0 auto;
        min-height:30px;
        padding:6px 10px;
        border:1px solid var(--pe-normal-border);
        border-radius:999px;
        background:var(--pe-normal-bg);
        color:var(--pe-normal-fg);
        font-size:11px;
        font-weight:900;
        white-space:nowrap;
      }
      .medassist-pe-title-summary[data-state="abnormal"]{
        border-color:var(--pe-abnormal-border);
        background:var(--pe-abnormal-bg);
        color:var(--pe-abnormal-fg);
      }
      .medassist-pe-title-summary[data-state="empty"]{
        border-color:var(--pe-empty-border);
        background:var(--pe-empty-bg);
        color:var(--pe-empty-fg);
      }

      .medassist-pe-normal-banner{
        position:relative;
        margin:0 0 14px!important;
        padding:11px 14px 11px 40px!important;
        border:1px solid #c7e4d1;
        border-radius:13px!important;
        background:#f0faf3!important;
        color:#245c3c;
        font-family:Arial,Helvetica,sans-serif!important;
        font-size:12px;
        font-weight:700;
        line-height:1.45;
      }
      .medassist-pe-normal-banner::before{
        content:"✓";
        position:absolute;
        left:13px;
        top:50%;
        display:grid;
        place-items:center;
        width:19px;
        height:19px;
        border-radius:50%;
        background:#2d8b58;
        color:#fff;
        font-size:11px;
        transform:translateY(-50%);
      }

      .medassist-pe-nav{
        display:flex;
        gap:7px;
        overflow-x:auto;
        margin:0 0 14px;
        padding:2px 1px 7px;
        scrollbar-width:thin;
      }
      .medassist-pe-nav button{
        display:inline-flex;
        align-items:center;
        gap:7px;
        flex:0 0 auto;
        min-height:35px;
        padding:7px 11px;
        border:1px solid #d6e4e0;
        border-radius:999px;
        background:#fff;
        color:#36544e;
        font:700 11px/1.2 Arial,Helvetica,sans-serif;
        cursor:pointer;
        transition:border-color .16s ease,background .16s ease,transform .16s ease;
      }
      .medassist-pe-nav button:hover{
        border-color:#91bdb4;
        background:#f1f9f7;
        transform:translateY(-1px);
      }
      .medassist-pe-nav-dot{
        width:7px;
        height:7px;
        border-radius:50%;
        background:#a9b4b7;
      }
      .medassist-pe-nav button[data-state="normal"] .medassist-pe-nav-dot,
      .medassist-pe-nav button[data-state="complete"] .medassist-pe-nav-dot{background:#2f9560}
      .medassist-pe-nav button[data-state="abnormal"] .medassist-pe-nav-dot{background:#d28b13}
      .medassist-pe-nav button[data-state="empty"] .medassist-pe-nav-dot{background:#9da9ad}
      .medassist-pe-nav button[hidden],
      .medassist-pe-system[hidden]{display:none!important}

      .medassist-pe-groups{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:14px!important;
        width:100%;
        margin:0!important;
        align-items:start!important;
      }
      .medassist-pe-groups > *{
        min-width:0;
        max-width:none!important;
      }
      .medassist-pe-system{
        --pe-accent:var(--pe-aqua);
        --pe-tint:var(--pe-aqua-tint);
        position:relative;
        min-width:0;
        overflow:hidden;
        border:1px solid var(--pe-border);
        border-left:4px solid var(--pe-accent);
        border-radius:16px;
        background:#fff;
        box-shadow:0 5px 18px rgba(23,64,57,.045);
        scroll-margin-top:18px;
        animation:medassistPeRise .2s ease-out both;
      }
      .medassist-pe-system[data-span="full"]{grid-column:1 / -1!important}
      .medassist-pe-system[data-theme="ent"]{--pe-accent:var(--pe-lilac);--pe-tint:var(--pe-lilac-tint)}
      .medassist-pe-system[data-theme="chest"]{--pe-accent:var(--pe-blue);--pe-tint:var(--pe-blue-tint)}
      .medassist-pe-system[data-theme="abdomen"]{--pe-accent:var(--pe-sand);--pe-tint:var(--pe-sand-tint)}
      .medassist-pe-system[data-theme="neuro"]{--pe-accent:var(--pe-slate);--pe-tint:var(--pe-slate-tint)}
      .medassist-pe-system[data-theme="other"]{--pe-accent:var(--pe-green);--pe-tint:var(--pe-green-tint)}
      .medassist-pe-system[data-state="abnormal"]{
        border-color:#e7c77f;
        border-left-color:#d28b13;
        box-shadow:0 7px 20px rgba(160,104,11,.08);
      }
      .medassist-pe-system-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        min-height:51px;
        padding:10px 12px;
        border-bottom:1px solid color-mix(in srgb,var(--pe-accent) 18%,#dfe9e6);
        background:var(--pe-tint);
      }
      .medassist-pe-system-name{
        display:flex;
        align-items:center;
        gap:9px;
        min-width:0;
      }
      .medassist-pe-system-icon{
        display:grid;
        place-items:center;
        flex:0 0 auto;
        min-width:29px;
        height:29px;
        padding:0 7px;
        border:1px solid color-mix(in srgb,var(--pe-accent) 30%,transparent);
        border-radius:9px;
        background:#fff;
        color:var(--pe-accent);
        font-size:10px;
        font-weight:900;
        letter-spacing:.03em;
      }
      .medassist-pe-system-name strong{
        display:block;
        overflow:hidden;
        color:#213c37;
        font-size:13px;
        line-height:1.25;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      .medassist-pe-status{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex:0 0 auto;
        min-height:26px;
        padding:5px 9px;
        border:1px solid var(--pe-empty-border);
        border-radius:999px;
        background:var(--pe-empty-bg);
        color:var(--pe-empty-fg);
        font-size:10px;
        font-weight:900;
        white-space:nowrap;
      }
      .medassist-pe-status[data-state="normal"],
      .medassist-pe-status[data-state="complete"]{
        border-color:var(--pe-normal-border);
        background:var(--pe-normal-bg);
        color:var(--pe-normal-fg);
      }
      .medassist-pe-status[data-state="abnormal"]{
        border-color:var(--pe-abnormal-border);
        background:var(--pe-abnormal-bg);
        color:var(--pe-abnormal-fg);
      }
      .medassist-pe-system-body{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:11px;
        padding:13px;
        min-width:0;
        background:#fff;
      }
      .medassist-pe-system-body[data-columns="1"]{grid-template-columns:minmax(0,1fr)}
      .medassist-pe-system-body[data-columns="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
      .medassist-pe-system-body > *{min-width:0}
      .medassist-pe-system-body > .medassist-pe-wide,
      .medassist-pe-system-body > .cln-exam-span,
      .medassist-pe-system-body > .tonsil-exam-card,
      .medassist-pe-system-body > .dengue-pa-wrap,
      .medassist-pe-system-body > .rme1-field-grid,
      .medassist-pe-system-body > .rme1-compact-checks,
      .medassist-pe-system-body > .rme1-layout-2,
      .medassist-pe-system-body > .iucd-exam-pair,
      .medassist-pe-system-body > .grid{
        grid-column:1 / -1!important;
        width:100%!important;
      }

      .medassist-pe-card label{
        color:#49605b;
        font-size:11.5px;
        letter-spacing:.005em;
      }
      .medassist-pe-card input,
      .medassist-pe-card select,
      .medassist-pe-card textarea{
        border-color:#d5e1de;
        background:#fff;
        transition:border-color .15s ease,box-shadow .15s ease,background .15s ease;
      }
      .medassist-pe-card input:hover,
      .medassist-pe-card select:hover,
      .medassist-pe-card textarea:hover{border-color:#accbc4}
      .medassist-pe-card input:focus,
      .medassist-pe-card select:focus,
      .medassist-pe-card textarea:focus{
        border-color:#3d978b;
        background:#fff;
        box-shadow:0 0 0 3px rgba(61,151,139,.11);
      }
      .medassist-pe-card textarea{min-height:76px}

      .medassist-pe-system-body .tonsil-exam-card,
      .medassist-pe-system-body .cln-field-wrap,
      .medassist-pe-system-body .dengue-pa-wrap,
      .medassist-pe-system-body .iucd-subcard,
      .medassist-pe-system-body .rme1-import-panel{
        margin:0!important;
        border-color:#dbe6e3!important;
        background:#fbfdfc!important;
        box-shadow:none!important;
      }
      .medassist-pe-system-body .tonsil-enlarged-details:not(.hidden),
      .medassist-pe-system-body .cln-extra:not(.hidden),
      .medassist-pe-system-body .dengue-pa-tender-sites:not(.hidden),
      .medassist-pe-system-body .referral-extra-detail:not(.hidden){
        border-color:var(--pe-abnormal-border)!important;
        background:#fffbf2!important;
      }
      .medassist-pe-system-body .dengue-pa-main-grid{
        grid-template-columns:repeat(2,minmax(0,220px))!important;
      }
      .medassist-pe-system-body .dengue-pa-additional-grid{margin-top:4px!important}
      .medassist-pe-system-body .rme1-section-kicker,
      .medassist-pe-system-body .neuro-section-label{
        grid-column:1 / -1;
        margin:0!important;
        padding:8px 10px;
        border-radius:9px;
        background:var(--pe-tint);
        color:var(--pe-accent);
      }
      .medassist-pe-system-body .rme1-derived{margin-top:0!important}
      .medassist-pe-system-body .rme1-field-grid{margin-top:0!important}
      .medassist-pe-system-body .rme1-layout-2{margin-top:0!important}
      .medassist-pe-system-body .iucd-five-grid{grid-column:1 / -1;width:100%}
      .medassist-pe-system-body .iucd-subcard{height:100%}
      .medassist-pe-generic .medassist-pe-title-summary{background:#eef5f3;color:#42635d;border-color:#d4e3df}

      @keyframes medassistPeRise{
        from{opacity:.65;transform:translateY(3px)}
        to{opacity:1;transform:none}
      }
      @media(prefers-reduced-motion:reduce){
        .medassist-pe-system{animation:none}
        .medassist-pe-nav button{transition:none}
      }
      @media(max-width:1050px){
        .medassist-pe-system-body[data-columns="3"]{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:760px){
        .medassist-pe-titlebar{
          align-items:flex-start;
          margin:-20px -20px 15px;
        }
        .medassist-pe-title-summary{white-space:normal;text-align:center}
        .medassist-pe-groups{grid-template-columns:minmax(0,1fr)!important}
        .medassist-pe-system{grid-column:1 / -1!important}
        .medassist-pe-system-body,
        .medassist-pe-system-body[data-columns="3"]{grid-template-columns:minmax(0,1fr)}
        .medassist-pe-system-body > *{grid-column:1 / -1!important}
        .medassist-pe-system-body .dengue-pa-main-grid{grid-template-columns:1fr!important}
      }
      @media(max-width:520px){
        .medassist-pe-card{padding:14px!important}
        .medassist-pe-titlebar{
          flex-direction:column;
          margin:-14px -14px 14px;
          padding:14px;
        }
        .medassist-pe-title-main{align-items:flex-start}
        .medassist-pe-title-summary{align-self:flex-start}
        .medassist-pe-system-head{align-items:flex-start}
        .medassist-pe-system-name strong{white-space:normal}
        .medassist-pe-system-body{padding:11px}
      }
    `;
    document.head.appendChild(style);
  }

  function decorateCard(card, subtitle = "Grouped by system for faster clinical scanning.") {
    if (!card) return null;
    card.classList.add("medassist-pe-card");

    const existing = card.querySelector(":scope > .medassist-pe-titlebar");
    if (existing) {
      return {
        bar: existing,
        summary: existing.querySelector(".medassist-pe-title-summary")
      };
    }

    const plainHeading = card.querySelector(":scope > h2");
    const compoundHeading = card.querySelector(":scope > .nnj-card-title");
    const heading = plainHeading || compoundHeading;
    if (!heading) return null;

    const bar = create("div", "medassist-pe-titlebar");
    const main = create("div", "medassist-pe-title-main");
    const icon = create("span", "medassist-pe-title-icon", "PE");
    icon.setAttribute("aria-hidden", "true");
    const copy = create("div", "medassist-pe-title-copy");
    const summary = create("span", "medassist-pe-title-summary", "System view");
    summary.dataset.state = "complete";

    heading.parentNode.insertBefore(bar, heading);
    copy.appendChild(heading);
    copy.appendChild(create("small", "", subtitle));
    main.append(icon, copy);
    bar.append(main, summary);
    return { bar, summary };
  }

  function setTitleSummary(title, text, state = "complete") {
    if (!title?.summary) return;
    title.summary.textContent = text;
    title.summary.dataset.state = state;
  }

  function makeSystem({ id, title, icon, theme = "general", nodes = [], span = "full", columns = 2 }) {
    const section = create("section", "medassist-pe-system");
    section.id = id;
    section.dataset.theme = theme;
    section.dataset.span = span;
    section.dataset.state = "empty";

    const head = create("div", "medassist-pe-system-head");
    const name = create("div", "medassist-pe-system-name");
    const glyph = create("span", "medassist-pe-system-icon", icon);
    glyph.setAttribute("aria-hidden", "true");
    name.append(glyph, create("strong", "", title));

    const badge = create("span", "medassist-pe-status", "Not assessed");
    badge.dataset.state = "empty";
    head.append(name, badge);

    const body = create("div", "medassist-pe-system-body");
    body.dataset.columns = String(columns);
    nodes.filter(Boolean).forEach(node => body.appendChild(node));
    section.append(head, body);

    return { section, body, badge, title, navButton: null, state: "empty", visible: true };
  }

  function setSystemStatus(view, state, text) {
    if (!view) return;
    view.state = state;
    view.section.dataset.state = state;
    view.badge.dataset.state = state;
    view.badge.textContent = text;
    if (view.navButton) {
      view.navButton.dataset.state = state;
      view.navButton.setAttribute("aria-label", `${view.title}: ${text}`);
    }
  }

  function addNavigation(card, views, beforeNode) {
    if (!card || !views.length || card.querySelector(":scope > .medassist-pe-nav")) return;
    const nav = create("nav", "medassist-pe-nav");
    nav.setAttribute("aria-label", "Physical examination sections");

    views.forEach(view => {
      const button = create("button", "", view.title);
      button.type = "button";
      button.dataset.state = view.state;
      const dot = create("span", "medassist-pe-nav-dot");
      dot.setAttribute("aria-hidden", "true");
      button.appendChild(dot);
      button.addEventListener("click", () => {
        view.section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      view.navButton = button;
      nav.appendChild(button);
    });

    card.insertBefore(nav, beforeNode);
  }

  function directChildContaining(parent, selector) {
    return [...(parent?.children || [])].find(node => node.matches?.(selector) || node.querySelector?.(selector)) || null;
  }

  function updateTitleFromViews(title, views, label = "systems") {
    const abnormal = views.filter(view => view.state === "abnormal").length;
    const reviewed = views.filter(view => view.state === "normal" || view.state === "complete").length;
    const empty = views.filter(view => view.state === "empty").length;
    if (abnormal) {
      setTitleSummary(title, `${abnormal} ${abnormal === 1 ? "section" : "sections"} to review`, "abnormal");
    } else if (reviewed) {
      const suffix = empty ? ` · ${empty} optional` : "";
      setTitleSummary(title, `${reviewed} ${label} reviewed${suffix}`, "complete");
    } else {
      setTitleSummary(title, "Not assessed", "empty");
    }
  }

  function abnormalCount(values) {
    return values.reduce((sum, value) => sum + Number(Boolean(value)), 0);
  }

  function syncDengueViewVisibility(view) {
    if (!view) return false;
    const visible = [...view.body.children].some(node => !node.classList.contains("dengue-pe-optional-hidden"));
    view.visible = visible;
    view.section.hidden = !visible;
    if (view.navButton) view.navButton.hidden = !visible;
    return visible;
  }

  function ensureDengueAbdomenOption(prefix) {
    const select = byId(`${prefix}PA`);
    if (!select || [...select.options].some(option => option.value === "hard / rigid")) return;
    const option = create("option", "", "hard / rigid");
    option.value = "hard / rigid";
    select.appendChild(option);
  }

  function enhanceDengue(prefix) {
    const tonsil = document.querySelector(`.tonsil-exam-card[data-tonsil-prefix="${prefix}"]`);
    const flow = tonsil?.parentElement;
    const card = flow?.closest(".card");
    if (!tonsil || !flow || !card || card.dataset.medassistPeEnhanced === "true") return;
    card.dataset.medassistPeEnhanced = "true";
    ensureDengueAbdomenOption(prefix);

    const title = decorateCard(card, "Normal findings stay compact; abnormal details open only when relevant.");
    card.querySelector(":scope > .normal-box")?.classList.add("medassist-pe-normal-banner");

    const original = [...flow.children];
    const throat = directChildContaining(flow, `#${prefix}Throat`);
    const tonsilNode = directChildContaining(flow, `.tonsil-exam-card[data-tonsil-prefix="${prefix}"]`);
    const nodes = directChildContaining(flow, `#${prefix}CervicalLN`);
    const lungs = directChildContaining(flow, `#${prefix}Lungs`);
    const cvs = directChildContaining(flow, `#${prefix}CVS`);
    const abdomen = directChildContaining(flow, `#${prefix}PA`);
    const gcs = directChildContaining(flow, `#${prefix}GCS`);
    const hydration = directChildContaining(flow, `#${prefix}Hydration`);
    const organ = directChildContaining(flow, `#${prefix}OrganFailure`);

    const otherField = byId(`${prefix}OtherPhysical`);
    const otherWrap = otherField?.closest(".dengue-pe-other-optional-wrap");
    const otherNodes = otherWrap
      ? [otherWrap]
      : [otherField?.previousElementSibling, otherField].filter(Boolean);

    const used = new Set([throat, tonsilNode, nodes, lungs, cvs, abdomen, gcs, hydration, organ].filter(Boolean));
    const leftovers = original.filter(node => !used.has(node));

    const views = [
      makeSystem({
        id: `${prefix}PeGeneralSystem`,
        title: "General & neurological",
        icon: "GEN",
        theme: "general",
        nodes: [gcs, hydration, organ],
        span: "full",
        columns: 3
      }),
      makeSystem({
        id: `${prefix}PeEntSystem`,
        title: "ENT & neck",
        icon: "ENT",
        theme: "ent",
        nodes: [throat, tonsilNode, nodes],
        span: "full",
        columns: 2
      }),
      makeSystem({
        id: `${prefix}PeChestSystem`,
        title: "Respiratory & cardiovascular",
        icon: "CR",
        theme: "chest",
        nodes: [lungs, cvs],
        span: "half",
        columns: 2
      }),
      makeSystem({
        id: `${prefix}PeAbdomenSystem`,
        title: "Abdomen",
        icon: "PA",
        theme: "abdomen",
        nodes: [abdomen],
        span: "half",
        columns: 1
      }),
      makeSystem({
        id: `${prefix}PeOtherSystem`,
        title: "Additional findings",
        icon: "+",
        theme: "other",
        nodes: [...leftovers, ...otherNodes],
        span: "full",
        columns: 1
      })
    ];

    flow.classList.add("medassist-pe-groups");
    flow.replaceChildren(...views.map(view => view.section));
    addNavigation(card, views, flow);

    function sync() {
      const entAbnormal = abnormalCount([
        !["", "not injected"].includes(fieldValue(`${prefix}Throat`).toLowerCase()),
        fieldValue(`${prefix}Tonsil`).toLowerCase() === "enlarged",
        fieldValue(`${prefix}TonsilInflammation`).toLowerCase() === "inflamed",
        fieldValue(`${prefix}CervicalLN`).toLowerCase() === "palpable"
      ]);
      setSystemStatus(views[1], entAbnormal ? "abnormal" : "normal", entAbnormal ? `${entAbnormal} abnormal` : "Normal");

      const chestAbnormal = abnormalCount([
        !["", "clear"].includes(fieldValue(`${prefix}Lungs`).toLowerCase()),
        !["", "drnm"].includes(fieldValue(`${prefix}CVS`).toLowerCase())
      ]);
      setSystemStatus(views[2], chestAbnormal ? "abnormal" : "normal", chestAbnormal ? `${chestAbnormal} abnormal` : "Normal");

      const abdomenFinding = fieldValue(`${prefix}PA`).toLowerCase();
      const abdomenAbnormal = abnormalCount([
        ["hard", "rigid", "hard/rigid", "hard / rigid"].includes(abdomenFinding),
        fieldValue(`${prefix}PATenderness`) === "yes",
        byId(`${prefix}PAHepatomegaly`)?.checked,
        byId(`${prefix}PAAscites`)?.checked
      ]);
      setSystemStatus(views[3], abdomenAbnormal ? "abnormal" : "normal", abdomenAbnormal ? `${abdomenAbnormal} abnormal` : "Normal");

      const gcsValue = fieldValue(`${prefix}GCS`).toLowerCase();
      const generalAbnormal = abnormalCount([
        gcsValue && !["full", "e4v5m6"].includes(gcsValue),
        fieldValue(`${prefix}Hydration`).toLowerCase() === "dehydrated",
        fieldValue(`${prefix}OrganFailure`).toLowerCase() === "yes"
      ]);
      setSystemStatus(views[0], generalAbnormal ? "abnormal" : "normal", generalAbnormal ? `${generalAbnormal} abnormal` : "Normal");

      const otherEntered = Boolean(fieldValue(`${prefix}OtherPhysical`));
      setSystemStatus(views[4], otherEntered ? "complete" : "empty", otherEntered ? "Entered" : "Optional");
      views.forEach(syncDengueViewVisibility);
      updateTitleFromViews(title, views.slice(0, 4).filter(view => view.visible));
    }

    ["input", "change"].forEach(type => card.addEventListener(type, sync));
    byId(prefix === "cl" ? "clReset" : "dfuReset")?.addEventListener("click", () => setTimeout(sync, 40));
    sync();
  }

  function filledControls(root) {
    return [...(root?.querySelectorAll("input,select,textarea") || [])].filter(control => {
      if (control.disabled || control.type === "hidden") return false;
      if (control.type === "checkbox" || control.type === "radio") return control.checked;
      const value = String(control.value || "").trim();
      return value && !/^(not assessed|not documented|not done \/ not documented)$/i.test(value);
    }).length;
  }

  function enhanceRme1() {
    const card = byId("rme1ExamCard");
    if (!card || card.dataset.medassistPeEnhanced === "true") return;
    card.dataset.medassistPeEnhanced = "true";
    const title = decorateCard(card, "Anthropometry, vital signs and examination findings separated into clear clinical groups.");

    const importPanel = card.querySelector(":scope > .rme1-import-panel");
    const vitalsGrid = card.querySelector(":scope > .rme1-field-grid");
    const bmiSummary = byId("rmeBmiSummary");
    const kicker = [...card.querySelectorAll(":scope > .rme1-section-kicker")][0];
    const checks = card.querySelector(":scope > .rme1-compact-checks");
    const systems = card.querySelector(":scope > .rme1-layout-2");
    const anchor = importPanel || vitalsGrid || kicker;
    if (!anchor) return;

    const groups = create("div", "medassist-pe-groups");
    card.insertBefore(groups, anchor);
    const views = [
      makeSystem({ id:"rmePeImportSystem", title:"TPC-OHCIS quick import", icon:"IN", theme:"general", nodes:[importPanel], span:"full", columns:1 }),
      makeSystem({ id:"rmePeVitalsSystem", title:"Anthropometry & vital signs", icon:"VS", theme:"chest", nodes:[vitalsGrid, bmiSummary], span:"full", columns:1 }),
      makeSystem({ id:"rmePeFindingsSystem", title:"Relevant examination findings", icon:"PE", theme:"ent", nodes:[kicker, checks], span:"half", columns:1 }),
      makeSystem({ id:"rmePeSystemsSystem", title:"System examination", icon:"SYS", theme:"abdomen", nodes:[systems], span:"half", columns:1 })
    ];
    groups.append(...views.map(view => view.section));
    addNavigation(card, views, groups);

    function sync() {
      const imported = Boolean(fieldValue("rmeVitalPaste"));
      setSystemStatus(views[0], imported ? "complete" : "empty", imported ? "Paste entered" : "Optional");

      const vitalCount = [
        "rmeHeight", "rmePrepregWeight", "rmeBookingWeight", "rmeSbp", "rmeDbp",
        "rmePulse", "rmeRr", "rmeTemp", "rmeSpo2"
      ].filter(id => fieldValue(id)).length;
      setSystemStatus(views[1], vitalCount ? "complete" : "empty", vitalCount ? `${vitalCount} entered` : "Not entered");

      const selectedFindings = views[2].body.querySelectorAll('input[type="checkbox"]:checked').length;
      setSystemStatus(views[2], selectedFindings ? "abnormal" : "normal", selectedFindings ? `${selectedFindings} selected` : "No abnormal selected");

      const systemCount = [fieldValue("rmeCardioresp"), fieldValue("rmeOtherExam")].filter(Boolean).length;
      setSystemStatus(views[3], systemCount ? "complete" : "empty", systemCount ? `${systemCount}/2 entered` : "Optional");
      updateTitleFromViews(title, views, "sections");
    }

    ["input", "change"].forEach(type => card.addEventListener(type, sync));
    byId("rmeClear")?.addEventListener("click", () => setTimeout(sync, 40));
    sync();
  }

  function enhanceIucd() {
    const card = byId("iucdExamCard");
    if (!card || card.dataset.medassistPeEnhanced === "true") return;
    card.dataset.medassistPeEnhanced = "true";
    const title = decorateCard(card, "Vital, abdominal and pelvic findings arranged by examination stage.");

    const vitals = card.querySelector(":scope > .iucd-five-grid");
    const labels = [...card.querySelectorAll(":scope > .neuro-section-label")];
    const abdomenLabel = labels.find(node => /per abdomen/i.test(node.textContent || ""));
    const speculumLabel = labels.find(node => /per speculum/i.test(node.textContent || ""));
    const abdomenGrid = abdomenLabel?.nextElementSibling;
    const pelvicPair = card.querySelector(":scope > .iucd-exam-pair");
    const speculumGrid = speculumLabel?.nextElementSibling;
    const anchor = vitals || abdomenLabel;
    if (!anchor) return;

    const groups = create("div", "medassist-pe-groups");
    card.insertBefore(groups, anchor);
    const views = [
      makeSystem({ id:"iucdPeVitalsSystem", title:"Vitals & pre-procedure checks", icon:"VS", theme:"general", nodes:[vitals], span:"full", columns:1 }),
      makeSystem({ id:"iucdPeAbdomenSystem", title:"Per abdomen", icon:"PA", theme:"abdomen", nodes:[abdomenLabel, abdomenGrid], span:"half", columns:1 }),
      makeSystem({ id:"iucdPePelvicSystem", title:"TAS & bimanual examination", icon:"PV", theme:"ent", nodes:[pelvicPair], span:"half", columns:1 }),
      makeSystem({ id:"iucdPeSpeculumSystem", title:"Per speculum examination", icon:"PS", theme:"chest", nodes:[speculumLabel, speculumGrid], span:"full", columns:1 })
    ];
    groups.append(...views.map(view => view.section));
    addNavigation(card, views, groups);

    function sync() {
      views.forEach(view => {
        const count = filledControls(view.body);
        setSystemStatus(view, count ? "complete" : "empty", count ? `${count} entered` : "Not assessed");
      });
      updateTitleFromViews(title, views, "sections");
    }

    ["input", "change"].forEach(type => card.addEventListener(type, sync));
    byId("iucdReset")?.addEventListener("click", () => setTimeout(sync, 40));
    sync();
  }

  function enhanceNnj() {
    const hydration = byId("nnjHydration");
    const flow = hydration?.closest(".grid.three");
    const card = flow?.closest(".card");
    if (!flow || !card || card.dataset.medassistPeEnhanced === "true") return;
    card.dataset.medassistPeEnhanced = "true";
    const title = decorateCard(card, "Grouped findings make neonatal red flags easier to scan without adding visual clutter.");

    const take = ids => ids.map(id => directChildContaining(flow, `#${id}`)).filter(Boolean);
    const generalNodes = take(["nnjHydration", "nnjExtent"]);
    const eliminationNodes = take(["nnjStoolColour", "nnjUrineColour"]);
    const neuroNodes = take(["nnjTone", "nnjAbe"]);
    const otherNodes = take(["nnjPallor", "nnjCephalo", "nnjHsm", "nnjRash"]);
    const otherField = byId("nnjOtherExam");
    const otherLabel = otherField?.previousElementSibling;
    if (otherLabel) otherNodes.push(otherLabel);
    if (otherField) otherNodes.push(otherField);

    const views = [
      makeSystem({ id:"nnjPeGeneralSystem", title:"General & jaundice extent", icon:"GEN", theme:"general", nodes:generalNodes, span:"half", columns:2 }),
      makeSystem({ id:"nnjPeEliminationSystem", title:"Stool & urine", icon:"OUT", theme:"abdomen", nodes:eliminationNodes, span:"half", columns:2 }),
      makeSystem({ id:"nnjPeNeuroSystem", title:"Neurological state", icon:"NS", theme:"chest", nodes:neuroNodes, span:"half", columns:2 }),
      makeSystem({ id:"nnjPeOtherSystem", title:"Other clinical findings", icon:"PE", theme:"ent", nodes:otherNodes, span:"half", columns:2 })
    ];
    flow.classList.add("medassist-pe-groups");
    flow.replaceChildren(...views.map(view => view.section));
    addNavigation(card, views, flow);

    function sync() {
      setSystemStatus(views[0], "complete", "Reviewed");
      setSystemStatus(views[1], "complete", "Reviewed");

      const neuroAbnormal = abnormalCount([
        fieldValue("nnjTone").toLowerCase() !== "normal",
        fieldValue("nnjAbe") === "yes"
      ]);
      setSystemStatus(views[2], neuroAbnormal ? "abnormal" : "normal", neuroAbnormal ? `${neuroAbnormal} abnormal` : "Normal");

      const otherAbnormal = ["nnjPallor", "nnjCephalo", "nnjHsm", "nnjRash"].filter(id => fieldValue(id) === "yes").length;
      const otherText = Boolean(fieldValue("nnjOtherExam"));
      const otherTotal = otherAbnormal + Number(otherText);
      setSystemStatus(views[3], otherTotal ? "abnormal" : "normal", otherTotal ? `${otherTotal} finding${otherTotal === 1 ? "" : "s"}` : "No abnormal selected");
      updateTitleFromViews(title, views, "systems");
    }

    ["input", "change"].forEach(type => card.addEventListener(type, sync));
    byId("nnjClear")?.addEventListener("click", () => setTimeout(sync, 40));
    sync();
  }

  function enhanceNcd(prefix) {
    const generalField = byId(`${prefix}GeneralExam`);
    const card = generalField?.closest(".card");
    if (!card || card.dataset.medassistPeEnhanced === "true") return;
    card.dataset.medassistPeEnhanced = "true";
    const title = decorateCard(card, "General, cardiorespiratory and peripheral findings separated for quick review.");

    const rootGrid = generalField.closest(".grid");
    if (!rootGrid) return;
    const generalWrap = directChildContaining(rootGrid, `#${prefix}GeneralExam`);
    const systemSelector = prefix === "dm" ? "#dmCVS" : "#htnLungs";
    const systemWrap = directChildContaining(rootGrid, systemSelector);
    const otherField = byId(`${prefix}OtherExam`);
    const otherNodes = [];
    if (otherField && !systemWrap?.contains(otherField)) {
      if (otherField.previousElementSibling?.tagName === "LABEL") otherNodes.push(otherField.previousElementSibling);
      otherNodes.push(otherField);
    }

    const views = [
      makeSystem({ id:`${prefix}PeGeneralSystem`, title:"General appearance", icon:"GEN", theme:"general", nodes:[generalWrap], span:"half", columns:1 }),
      makeSystem({ id:`${prefix}PeChestSystem`, title:"Cardiorespiratory & peripheral", icon:"CR", theme:"chest", nodes:[systemWrap], span:"half", columns:1 })
    ];
    if (otherNodes.length) {
      views.push(makeSystem({ id:`${prefix}PeOtherSystem`, title:"Additional examination", icon:"+", theme:"other", nodes:otherNodes, span:"full", columns:1 }));
    }

    rootGrid.classList.add("medassist-pe-groups");
    rootGrid.replaceChildren(...views.map(view => view.section));
    addNavigation(card, views, rootGrid);

    function sync() {
      setSystemStatus(views[0], fieldValue(`${prefix}GeneralExam`) ? "complete" : "empty", fieldValue(`${prefix}GeneralExam`) ? "Entered" : "Not entered");

      const oedemaId = prefix === "dm" ? "dmOedema" : "htnOedema";
      const jvpAbnormal = prefix === "htn" && fieldValue("htnJvp") === "yes";
      const oedemaAbnormal = ["present", "yes"].includes(fieldValue(oedemaId));
      const chestAbnormal = abnormalCount([jvpAbnormal, oedemaAbnormal]);
      setSystemStatus(views[1], chestAbnormal ? "abnormal" : "normal", chestAbnormal ? `${chestAbnormal} abnormal` : "Reviewed");

      if (views[2]) {
        const entered = Boolean(fieldValue(`${prefix}OtherExam`));
        setSystemStatus(views[2], entered ? "complete" : "empty", entered ? "Entered" : "Optional");
      }
      updateTitleFromViews(title, views, "systems");
    }

    ["input", "change"].forEach(type => card.addEventListener(type, sync));
    byId(`${prefix}Reset`)?.addEventListener("click", () => setTimeout(sync, 40));
    sync();
  }

  function enhanceRemainingExamCards() {
    document.querySelectorAll(".card").forEach(card => {
      if (card.dataset.medassistPeEnhanced === "true") return;
      const heading = card.querySelector(":scope > h2, :scope > .nnj-card-title h2");
      if (!heading || !/\b(examination|physical exam|clinical observation)\b/i.test(heading.textContent || "")) return;
      card.dataset.medassistPeEnhanced = "true";
      card.classList.add("medassist-pe-generic");
      decorateCard(card, "Structured clinical findings with clearer visual hierarchy.");
    });
  }

  function init() {
    addStyles();
    DENGUE_PREFIXES.forEach(enhanceDengue);
    enhanceRme1();
    enhanceIucd();
    enhanceNnj();
    enhanceNcd("dm");
    enhanceNcd("htn");
    enhanceRemainingExamCards();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
