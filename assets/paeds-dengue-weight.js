/* Paediatric dengue fluid weight basis.
 * Source: MOH CPG Management of Dengue in Children, 2nd Edition (2020),
 * Section 5.2 p19 ("For overweight or obese patients, the ideal body weight
 * should be used for calculating fluid infusion rates") and Appendix 7 pp47-48.
 * Appendix 7 is chart-based (Moore / McLaren methods), so paediatric IBW is
 * entered by the clinician and never estimated here.
 * Overweight/obesity screen: WHO BMI-for-age (2006 standards 0-60 months:
 * overweight >+2 SD, obesity >+3 SD; 2007 reference 61-228 months:
 * overweight >+1 SD, obesity >+2 SD). */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MedAssistPaedsDengueWeight = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SOURCE = "CPG Management of Dengue in Children, 2nd Ed (2020), p19 & Appendix 7 (pp47–48)";
  const IBW_METHOD = "Appendix 7: height 5th–95th centile → weight-for-age on the same centile as height-for-age (Moore); height >95th centile → 50th-centile weight for height-age (McLaren).";

  const positive = value => Number.isFinite(Number(value)) && Number(value) > 0;
  const round1 = value => Math.round((Number(value) + Number.EPSILON) * 10) / 10;

  function ageInMonths(age, unit) {
    const n = Number(age);
    if (age === "" || age === null || age === undefined || !Number.isFinite(n) || n < 0) return null;
    return unit === "months" ? n : n * 12;
  }

  function lmsAt(tables, ageMonths, sex) {
    if (!tables || !Number.isFinite(ageMonths) || !["Male", "Female"].includes(sex)) return null;
    const month = Math.floor(ageMonths + 1e-9);
    const key = month <= 60 ? "under5" : month <= 228 ? "fiveTo19" : null;
    const packed = key && tables[key] && tables[key].bmi && tables[key].bmi[sex];
    if (!Array.isArray(packed) || !Array.isArray(packed[1])) return null;
    const row = packed[1][month - packed[0]];
    return row ? {key, month, L: row[0], M: row[1], S: row[2]} : null;
  }

  function valueAtZ(lms, z) {
    if (Math.abs(lms.L) < 1e-12) return lms.M * Math.exp(lms.S * z);
    const base = 1 + lms.L * lms.S * z;
    return base > 0 ? lms.M * Math.pow(base, 1 / lms.L) : NaN;
  }

  // WHO LMS z-score with the WHO restricted-tail adjustment beyond ±3 SD.
  function zScore(lms, x) {
    if (!lms || !positive(x)) return NaN;
    const raw = Math.abs(lms.L) < 1e-12
      ? Math.log(x / lms.M) / lms.S
      : (Math.pow(x / lms.M, lms.L) - 1) / (lms.L * lms.S);
    if (raw > 3) {
      const sd2 = valueAtZ(lms, 2), sd3 = valueAtZ(lms, 3);
      return 3 + (x - sd3) / (sd3 - sd2);
    }
    if (raw < -3) {
      const sdNeg3 = valueAtZ(lms, -3), sdNeg2 = valueAtZ(lms, -2);
      return -3 + (x - sdNeg3) / (sdNeg2 - sdNeg3);
    }
    return raw;
  }

  function screen({weight, height, sex, age, ageUnit, tables}) {
    const months = ageInMonths(age, ageUnit);
    if (!positive(weight)) return {status: "unknown", reason: "weight not entered"};
    if (!positive(height)) return {status: "unknown", reason: "height not entered"};
    if (!["Male", "Female"].includes(sex)) return {status: "unknown", reason: "sex not selected"};
    if (months === null) return {status: "unknown", reason: "age not entered"};
    if (Math.floor(months + 1e-9) > 228) return {status: "unknown", reason: "age above the WHO 5–19 year reference"};
    const lms = lmsAt(tables, months, sex);
    if (!lms) return {status: "unknown", reason: "WHO reference data unavailable — refresh the page"};
    const bmi = Number(weight) / Math.pow(Number(height) / 100, 2);
    const z = zScore(lms, bmi);
    if (!Number.isFinite(z)) return {status: "unknown", reason: "BMI-for-age could not be calculated"};
    const under5 = lms.key === "under5";
    const status = z > (under5 ? 3 : 2) ? "obese" : z > (under5 ? 2 : 1) ? "overweight" : "not overweight";
    return {
      status,
      z: Math.round(z * 100) / 100,
      bmi: round1(bmi),
      reference: under5 ? "WHO 2006 (0–5 y): overweight >+2 SD, obesity >+3 SD" : "WHO 2007 (5–19 y): overweight >+1 SD, obesity >+2 SD",
      approximateAge: ageUnit !== "months"
    };
  }

  function zText(z) {
    return `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(2)}`;
  }

  function screenText(result) {
    if (!result || result.status === "unknown") {
      return `Overweight/obesity screen not done (${result && result.reason ? result.reason : "data incomplete"}). CPG: use ideal body weight if the child is overweight or obese.`;
    }
    const age = result.approximateAge ? " Age entered in completed years — z-score is approximate." : "";
    return `BMI ${result.bmi} kg/m², WHO BMI-for-age z ${zText(result.z)}: ${result.status} (${result.reference}).${age}`;
  }

  /* basis: "actual" or "pibw" (clinician-entered paediatric IBW). */
  function select({actual, basis, ibw, screenResult}) {
    if (!positive(actual)) return {valid: false, error: "Enter patient weight first."};
    const w = Number(actual);
    const heavy = screenResult && ["overweight", "obese"].includes(screenResult.status);
    if (basis === "pibw") {
      if (!positive(ibw)) return {valid: false, error: `Enter the paediatric ideal body weight read from the growth chart. ${IBW_METHOD}`};
      const i = Number(ibw);
      if (i >= w) return {valid: false, error: "Entered ideal body weight is not below the actual weight. Recheck the chart reading; IBW is used only for overweight/obese children — otherwise select actual body weight."};
      return {valid: true, selected: i, basis: "pibw", label: "paediatric ideal body weight (CPG Appendix 7)", warning: ""};
    }
    if (heavy) {
      return {valid: false, error: `${screenText(screenResult)} CPG Dengue in Children 2020 (p19): use ideal body weight for fluid rates in overweight/obese children. Select "Ideal body weight — paediatric" and enter IBW. ${IBW_METHOD}`};
    }
    const warning = screenResult && screenResult.status === "unknown" ? screenText(screenResult) : "";
    return {valid: true, selected: w, basis: "actual", label: "actual body weight", warning};
  }

  return {SOURCE, IBW_METHOD, ageInMonths, lmsAt, zScore, screen, screenText, select};
});
