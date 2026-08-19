const test = require("node:test");
const assert = require("node:assert/strict");

const { classifyStopBang } = require("../assets/clinical-safety.js");

test("STOP-BANG 0–2 without a combination trigger is low risk", () => {
  assert.equal(classifyStopBang({ snoring: true, tired: true }).risk, "low");
});

test("STOP-BANG 3–4 without the special combination is intermediate risk", () => {
  const result = classifyStopBang({ snoring: true, bmiOver35: true, ageOver50: true });
  assert.equal(result.score, 3);
  assert.equal(result.stopCount, 1);
  assert.equal(result.risk, "intermediate");
});

test("two STOP questions plus male sex is high risk", () => {
  const result = classifyStopBang({ snoring: true, tired: true, male: true });
  assert.equal(result.score, 3);
  assert.equal(result.highByCombination, true);
  assert.equal(result.risk, "high");
});

test("two STOP questions plus BMI over 35 is high risk", () => {
  const result = classifyStopBang({ observedApnoea: true, highBloodPressure: true, bmiOver35: true });
  assert.equal(result.score, 3);
  assert.equal(result.highByCombination, true);
  assert.equal(result.risk, "high");
});

test("two STOP questions plus neck circumference over 40 is high risk", () => {
  const result = classifyStopBang({ snoring: true, observedApnoea: true, neckOver40: true });
  assert.equal(result.score, 3);
  assert.equal(result.highByCombination, true);
  assert.equal(result.risk, "high");
});

test("a total score of at least five is high risk", () => {
  const result = classifyStopBang([true, false, true, false, false, true, true, true]);
  assert.equal(result.score, 5);
  assert.equal(result.risk, "high");
});
