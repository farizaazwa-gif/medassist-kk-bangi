(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.MedAssistClinicalSafety = Object.freeze(api);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STOP_BANG_KEYS = Object.freeze([
    "snoring",
    "tired",
    "observedApnoea",
    "highBloodPressure",
    "bmiOver35",
    "ageOver50",
    "neckOver40",
    "male"
  ]);

  const STOP_KEYS = Object.freeze(STOP_BANG_KEYS.slice(0, 4));
  const COMBINATION_KEYS = Object.freeze(["bmiOver35", "neckOver40", "male"]);

  function normaliseStopBangAnswers(input) {
    if (Array.isArray(input)) {
      return Object.fromEntries(
        STOP_BANG_KEYS.map((key, index) => [key, Boolean(input[index])])
      );
    }

    const source = input && typeof input === "object" ? input : {};
    return Object.fromEntries(
      STOP_BANG_KEYS.map(key => [key, Boolean(source[key])])
    );
  }

  /**
   * Official STOP-Bang risk stratification.
   * High risk is either a total score of 5–8, or at least two positive STOP
   * questions plus male sex, BMI >35 kg/m², or neck circumference >40 cm.
   */
  function classifyStopBang(input) {
    const answers = normaliseStopBangAnswers(input);
    const score = STOP_BANG_KEYS.reduce(
      (total, key) => total + Number(answers[key]),
      0
    );
    const stopCount = STOP_KEYS.reduce(
      (total, key) => total + Number(answers[key]),
      0
    );
    const combinationFactors = COMBINATION_KEYS.filter(key => answers[key]);
    const highByCombination = stopCount >= 2 && combinationFactors.length > 0;
    const risk = score >= 5 || highByCombination
      ? "high"
      : score >= 3
        ? "intermediate"
        : "low";

    return Object.freeze({
      score,
      stopCount,
      risk,
      highByCombination,
      combinationFactors: Object.freeze(combinationFactors.slice()),
      answers: Object.freeze({ ...answers })
    });
  }

  return Object.freeze({
    STOP_BANG_KEYS,
    classifyStopBang
  });
});
