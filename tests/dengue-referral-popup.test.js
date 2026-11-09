const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../assets/dengue-referral-popup.js");
const C = require("../assets/dengue-cpg4.js");

const base = {
  phase: "critical phase", haemo: "haemodynamically stable", vomit: 0, stool: 0, oral: "able",
  comorbidities: [], age: "30"
};
const adult = s => P.view({ ...C.assess({ ...base, ...s }), enabled: true }, true);

test("adult view maps CPG4 Table 6 groups and hospital need", () => {
  const a = adult({});
  assert.equal(a.category, "A");
  assert.equal(a.referral, false);
  assert.equal(a.categoryLabel, "Group A");
  assert.match(a.categoryDetail, /outpatient/);

  const b2 = adult({ vomit: 5 });
  assert.equal(b2.category, "B2");
  assert.equal(b2.referral, true);
  assert.match(b2.reasons.join(" "), /persistent vomiting/);
  assert.match(b2.categoryDetail, /admit to hospital/);

  const c = adult({ haemo: "compensated shock" });
  assert.equal(c.category, "C");
  assert.equal(c.referral, true);
  assert.equal(c.urgent, true);

  // Concern only (non-intense abdominal pain): not grouped, no referral.
  const review = adult({ abdominalPain: true });
  assert.equal(review.category, "");
  assert.equal(review.referral, false);
});

test("pop-up shows once per change: referral always, category only when the diagnosis is complete", () => {
  const b2 = adult({ vomit: 5 });
  let d = P.decide(b2, "", false);
  assert.equal(d.action, "referral");
  assert.equal(P.decide(b2, d.key, false).action, "none", "closed pop-up does not reopen for the same state");
  const c = adult({ vomit: 5, haemo: "compensated shock" });
  assert.equal(P.decide(c, d.key, false).action, "referral", "escalation B2 → C reopens");

  const a = adult({});
  assert.equal(P.decide(a, "", false).action, "none", "no category pop-up while the diagnosis is incomplete");
  d = P.decide(a, "", true);
  assert.equal(d.action, "category");
  assert.equal(P.decide(a, d.key, true).action, "none");

  const review = adult({ abdominalPain: true });
  assert.equal(P.decide(review, "", true).action, "none", "concern-only state never pops up");
});

test("paediatric view: referral criteria only, no A/B1/B2/C", () => {
  const red = P.view({ enabled: true, level: "red", reasons: ["compensated shock"] }, false);
  assert.equal(red.referral, true);
  assert.equal(red.urgent, true);
  assert.equal(red.category, "");
  assert.equal(P.decide(red, "", false).action, "referral");
  const none = P.view({ enabled: true, level: "neutral", reasons: [] }, false);
  assert.equal(none.referral, false);
  assert.equal(P.decide(none, "", true).action, "none");
});

test("category line under the generated diagnosis", () => {
  assert.equal(P.categoryLine(adult({}), false), "");
  assert.equal(P.categoryLine(adult({}), true), "Category: Group A — confirm outpatient suitability");
  assert.match(P.categoryLine(adult({ vomit: 5 }), false), /^Category: Group B2 — .* · needs hospital referral$/);
  assert.equal(P.categoryLine(P.view({ enabled: true, level: "amber", reasons: ["x"] }, false), false), "Hospital referral criteria met (CPG Dengue in Children 2020)");
});
