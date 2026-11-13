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

test("giliran OPD: allocation lists every number sent to each room, in registration order, whatever its status", () => {
  const rooms = [{ name: "1A", open: true }, { name: "1B", open: true }, { name: "3A", open: false }];
  const patients = [
    { id: "a", no: "W5", room: "1A", status: L.ST.W, t: 50 },
    { id: "b", no: "W1", room: "1B", status: L.ST.D, t: 10 },
    { id: "c", no: "W2", room: "1A", status: L.ST.C, t: 20 },
    { id: "d", no: "W3", room: "1A", status: L.ST.N, t: 30 }
  ];
  assert.deepEqual(L.allocation(rooms, patients), [
    { name: "1A", open: true, nos: ["W2", "W3", "W5"] },
    { name: "1B", open: true, nos: ["W1"] },
    { name: "3A", open: false, nos: [] }
  ]);
});

test("giliran OPD: allocation grid places rooms by block and letter, with gaps kept and odd codes set aside", () => {
  const rooms = ["1A", "1B", "1C", "9A", "9B", "Triaj"].map(name => ({ name, open: true }));
  const g = L.allocationRows(rooms, [{ id: "x", no: "W1", room: "9B", status: L.ST.W, t: 1 }]);
  assert.deepEqual(g.cols, ["A", "B", "C"]);
  assert.deepEqual(g.rows.map(r => r.block), ["1", "9"]);
  assert.deepEqual(g.rows[1].cells.map(c => c && c.name), ["9A", "9B", null], "9C does not exist, so its cell stays empty");
  assert.deepEqual(g.rows[1].cells[1].nos, ["W1"]);
  assert.deepEqual(g.other.map(a => a.name), ["Triaj"]);
});

test("giliran OPD: the room board shows allocation only, not waiting or called status", () => {
  const app = fs.readFileSync(path.join(DIR, "app.js"), "utf8");
  const start = app.indexOf("// Agihan hari ini");
  assert.ok(start > 0, "board render block exists");
  const board = app.slice(start, app.indexOf("function renderSettings"));
  assert.match(board, /L\.allocationRows\(rooms, patients\)/);
  assert.doesNotMatch(board, /menunggu|Dipanggil/i);
});

test("giliran OPD: the counter shows only how many were registered, overall and per room", () => {
  const app = fs.readFileSync(path.join(DIR, "app.js"), "utf8");
  const stats = app.slice(app.indexOf("function renderStats"), app.indexOf("function renderRoomGrid"));
  assert.match(stats, /Didaftar/);
  assert.doesNotMatch(stats, /Menunggu|Dipanggil|Selesai|Tidak hadir/);
  const tiles = app.slice(app.indexOf("function renderRoomGrid"), app.indexOf("function renderToday"));
  assert.match(tiles, /didaftar/);
  assert.doesNotMatch(tiles, /menunggu/i);
});

test("giliran OPD: Malaysian date key rolls over at local midnight", () => {
  assert.equal(L.dayKey(new Date("2026-11-12T15:59:00Z")), "2026-11-12");
  assert.equal(L.dayKey(new Date("2026-11-12T16:01:00Z")), "2026-11-13");
});

test("giliran OPD: script links carry a version that changes with the scripts, so browsers never mix old and new files", () => {
  const crypto = require("node:crypto");
  const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
  const files = ["config.js", "logic.js", "app.js"];
  const want = crypto.createHash("sha256")
    .update(Buffer.concat(files.map(f => fs.readFileSync(path.join(DIR, f)))))
    .digest("hex").slice(0, 10);
  files.forEach(f => {
    const m = html.match(new RegExp('<script src="' + f.replace(".", "\\.") + '\\?v=([0-9a-f]+)">'));
    assert.ok(m, f + " is loaded with ?v=");
    assert.equal(m[1], want, "Update giliran-opd/index.html: " + f + "?v=" + want +
      " (run: cd giliran-opd && cat config.js logic.js app.js | sha256sum | cut -c1-10)");
  });
});

test("giliran OPD: page loads its scripts and keeps patient identifiers out of the schema", () => {
  const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
  ["config.js", "logic.js", "app.js"].forEach(src => {
    assert.match(html, new RegExp('<script src="' + src.replace(".", "\\.") + '\\?v=[0-9a-f]{10}">'));
    assert.equal(fs.existsSync(path.join(DIR, src)), true, src + " must exist");
  });
  const sql = fs.readFileSync(path.join(DIR, "setup.sql"), "utf8").toLowerCase();
  assert.match(sql, /enable row level security/);
  ["nama_pesakit", "ic", "kad_pengenalan", "mrn"].forEach(col => {
    assert.doesNotMatch(sql, new RegExp("\\b" + col + "\\b\\s+text"), col + " must not be stored");
  });
});

test("giliran OPD: log out signs out only this device, so a shared clinic account stays in on other screens", () => {
  const app = fs.readFileSync(path.join(DIR, "app.js"), "utf8");
  const calls = app.match(/signOut\([^)]*\)/g) || [];
  assert.ok(calls.length > 0, "app.js signs out somewhere");
  calls.forEach(c => assert.match(c, /scope:\s*'local'/, c + " must use local scope"));
});
