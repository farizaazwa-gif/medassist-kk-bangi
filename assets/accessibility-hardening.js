(function () {
  "use strict";

  let generatedId = 0;

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function hasAccessibleName(control) {
    return Boolean(
      control.labels?.length ||
      cleanText(control.getAttribute("aria-label")) ||
      cleanText(control.getAttribute("aria-labelledby")) ||
      cleanText(control.getAttribute("title"))
    );
  }

  function humaniseId(id) {
    return cleanText(
      String(id || "")
        .replace(/^(?:cl|dfu|dm|htn|nnj|adhd|autism|rme|iucd|abx|gdm|bw|mh|pk|sb|ob)(?=[A-Z0-9])/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
    );
  }

  function directLabel(container) {
    if (!container) return null;
    return [...container.children].find(element =>
      element.tagName === "LABEL" &&
      !element.matches(".check-item,.rme1-symptom-item,.plan-subplan-item,.iucd-mec-item")
    ) || null;
  }

  function inferredLabel(control) {
    const placeholder = cleanText(control.getAttribute("placeholder"));
    const ownContainer = control.parentElement;
    const nearest = directLabel(ownContainer) ||
      directLabel(ownContainer?.parentElement) ||
      (control.previousElementSibling?.tagName === "LABEL"
        ? control.previousElementSibling
        : null);
    const labelText = cleanText(nearest?.textContent);
    const idText = humaniseId(control.id);

    if (labelText && idText && !labelText.toLowerCase().includes(idText.toLowerCase())) {
      return `${labelText} — ${idText}`;
    }

    return labelText || placeholder || idText || `${control.tagName.toLowerCase()} field`;
  }

  function labelControl(control) {
    if (!(control instanceof HTMLElement)) return;
    if (!control.matches("input,select,textarea")) return;
    if (control.matches('input[type="hidden"],[aria-hidden="true"]')) return;
    if (hasAccessibleName(control)) return;

    const container = control.parentElement;
    const label = directLabel(container);
    const formControls = container
      ? [...container.querySelectorAll(":scope > input:not([type='hidden']),:scope > select,:scope > textarea")]
      : [];

    if (label && formControls.length === 1) {
      if (!control.id) control.id = `medassist-field-${++generatedId}`;
      label.htmlFor = control.id;
      label.dataset.autoA11y = "true";
      return;
    }

    control.setAttribute("aria-label", inferredLabel(control));
    control.dataset.autoA11y = "true";
  }

  function enhanceRegion(root) {
    if (!(root instanceof Element || root instanceof Document)) return;

    root.querySelectorAll("input,select,textarea").forEach(labelControl);

    root.querySelectorAll(
      ".result-box,.ncd-auto-value,.ncd-referral-alert,.dengue-referral-alert,.rme1-engine-result,.lab-search-status"
    ).forEach(region => {
      if (!region.hasAttribute("role")) region.setAttribute("role", "status");
      if (!region.hasAttribute("aria-live")) region.setAttribute("aria-live", "polite");
    });

    root.querySelectorAll('a[target="_blank"]').forEach(link => {
      const rel = new Set(cleanText(link.getAttribute("rel")).split(" ").filter(Boolean));
      rel.add("noopener");
      rel.add("noreferrer");
      link.setAttribute("rel", [...rel].join(" "));
    });

    root.querySelectorAll("img").forEach(image => {
      if (!image.hasAttribute("loading")) image.loading = "lazy";
      if (!image.hasAttribute("decoding")) image.decoding = "async";
    });
  }

  function init() {
    enhanceRegion(document);

    const observer = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (node instanceof Element) {
            labelControl(node);
            enhanceRegion(node);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.MedAssistAccessibility = Object.freeze({ enhance: enhanceRegion });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
