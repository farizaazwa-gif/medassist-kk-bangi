const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const L = require("../giliran-opd/logic.js");
const DIR = path.join(__dirname, "..", "giliran-opd");

const ROOMS = ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C", "4A", "4B", "4C", "8A", "8B", "8C", "9A", "9B"]
  .map(name => ({ name, open: true }));

function assignMany(rooms, count) {
  const patients = [];
  for (let i = 0; i < count; i++) {
    const room = L.pickRoom(rooms, L.loadMap(rooms, patients));
    patients.push({ id: "p" + i, no: String(1001 + i), room, status: L.ST.W, t: i });
  }
  return patients;
}

test("giliran OPD: new patients spread evenly across open rooms in list order", () => {
  const patients = assignMany(ROOMS, 20);
  assert.equal(patients[0].room, "1A");
  assert.equal(patients[16].room, "9B");
  assert.equal(patients[17].room, "1A");
  const m = L.loadMap(ROOMS, patients);
  const waits = Object.values(m).map(x => x.w);
  assert.ok(Math.max(...waits) - Math.min(...waits) <= 1, "no room is more than one patient ahead");
});

test("giliran OPD: closed rooms receive no new patients", () => {
  const rooms = ROOMS.map(r => (r.name === "1A" ? { ...r, open: false } : r));
  const patients = assignMany(rooms, 40);
  assert.equal(patients.some(p => p.room === "1A"), false);
});

test("giliran OPD: finished patients free up a room for the next arrival", () => {
  const rooms = ROOMS.slice(0, 2);
  const patients = [
    { id: "a", room: "1A", status: L.ST.D, t: 1 },
    { id: "b", room: "1B", status: L.ST.W, t: 2 }
  ];
  assert.equal(L.pickRoom(rooms, L.loadMap(rooms, patients)), "1A");
});

test("giliran OPD: closing a room moves only its waiting patients", () => {
  const patients = assignMany(ROOMS, 34);
  patients.find(p => p.room === "2B").status = L.ST.C;
  const plan = L.planClose(ROOMS, patients, "2B");
  assert.equal(plan.moves.length, 1, "the called patient stays, the waiting one moves");
  assert.equal(plan.stranded, 0);
  plan.moves.forEach(mv => assert.notEqual(mv.to, "2B"));
});

test("giliran OPD: with every other room closed, waiting patients stay put", () => {
  const rooms = ROOMS.slice(0, 2).map(r => (r.name === "1B" ? { ...r, open: false } : r));
  const patients = [{ id: "x", room: "1A", status: L.ST.W, t: 1 }];
  const plan = L.planClose(rooms, patients, "1A");
  assert.equal(plan.moves.length, 0);
  assert.equal(plan.stranded, 1);
});

test("giliran OPD: no room is chosen when all rooms are closed", () => {
  const rooms = ROOMS.map(r => ({ ...r, open: false }));
  assert.equal(L.pickRoom(rooms, L.loadMap(rooms, [])), null);
});

test("giliran OPD: room state lists the next patient first", () => {
  const patients = [
    { id: "1", room: "3A", status: L.ST.W, t: 30 },
    { id: "2", room: "3A", status: L.ST.W, t: 10 },
    { id: "3", room: "3A", status: L.ST.C, t: 5, calledAt: 100 }
  ];
  const s = L.roomState(patients, "3A");
  assert.equal(s.current.id, "3");
  assert.deepEqual(s.waiting.map(p => p.id), ["2", "1"]);
});

test("giliran OPD: Malaysian date key rolls over at local midnight", () => {
  assert.equal(L.dayKey(new Date("2026-11-12T15:59:00Z")), "2026-11-12");
  assert.equal(L.dayKey(new Date("2026-11-12T16:01:00Z")), "2026-11-13");
});

test("giliran OPD: page loads its scripts and keeps patient identifiers out of the schema", () => {
  const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
  ["config.js", "logic.js", "app.js"].forEach(src => {
    assert.match(html, new RegExp('<script src="' + src.replace(".", "\\.") + '">'));
    assert.equal(fs.existsSync(path.join(DIR, src)), true, src + " must exist");
  });
  const sql = fs.readFileSync(path.join(DIR, "setup.sql"), "utf8").toLowerCase();
  assert.match(sql, /enable row level security/);
  ["nama_pesakit", "ic", "kad_pengenalan", "mrn"].forEach(col => {
    assert.doesNotMatch(sql, new RegExp("\\b" + col + "\\b\\s+text"), col + " must not be stored");
  });
});
