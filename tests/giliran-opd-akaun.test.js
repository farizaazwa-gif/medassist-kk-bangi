const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const nodeModule = require("node:module");

const SRC = path.join(__dirname, "..", "giliran-opd", "supabase", "functions", "urus-akaun", "index.ts");

/* A small in-memory stand-in for Supabase: an allow-list table, auth users and session tokens. */
function fakeSupabase(state) {
  function table(name) {
    assert.equal(name, "giliran_akaun");
    const filters = [];
    let op = "select", payload = null;
    const rows = () => [...state.allow.entries()].map(([email, admin]) => ({ email, admin }));
    const match = r => filters.every(([k, v]) => r[k] === v);
    const exec = () => {
      if (op === "select") return { data: rows().filter(match), error: null };
      if (op === "upsert") { state.allow.set(payload.email, !!payload.admin); return { data: null, error: null }; }
      if (op === "update") { rows().filter(match).forEach(r => state.allow.set(r.email, !!payload.admin)); return { data: null, error: null }; }
      if (op === "delete") { rows().filter(match).forEach(r => state.allow.delete(r.email)); return { data: null, error: null }; }
      throw new Error("unknown op " + op);
    };
    const q = {
      select() { op = "select"; return q; },
      upsert(p) { op = "upsert"; payload = p; return q; },
      update(p) { op = "update"; payload = p; return q; },
      delete() { op = "delete"; return q; },
      eq(k, v) { filters.push([k, v]); return q; },
      order() { return q; },
      maybeSingle() { const r = exec(); return Promise.resolve({ data: r.data[0] || null, error: null }); },
      then(res, rej) { return Promise.resolve(exec()).then(res, rej); }
    };
    return q;
  }
  let nextId = 1;
  return {
    from: table,
    auth: {
      async getUser(token) {
        const email = state.tokens.get(token);
        return email ? { data: { user: { email } }, error: null } : { data: { user: null }, error: { status: 401 } };
      },
      admin: {
        async listUsers() { return { data: { users: state.users.slice() }, error: null }; },
        async createUser({ email, password, email_confirm }) {
          assert.equal(email_confirm, true, "accounts are created confirmed, no email needed");
          if (state.users.some(u => u.email === email)) return { data: null, error: { code: "email_exists" } };
          state.users.push({ id: "u" + nextId++, email, password });
          return { data: {}, error: null };
        },
        async updateUserById(id, { password }) { state.users.find(u => u.id === id).password = password; return { data: {}, error: null }; },
        async deleteUser(id) { state.users = state.users.filter(u => u.id !== id); return { data: {}, error: null }; }
      }
    }
  };
}

function loadFunction(state) {
  const ts = fs.readFileSync(SRC, "utf8");
  const js = nodeModule.stripTypeScriptTypes(ts)
    .replace(/^import \{ createClient \} from "npm:@supabase\/supabase-js@[^"]+";$/m, "const { createClient } = __mock;");
  assert.match(js, /const \{ createClient \} = __mock;/, "the function imports supabase-js in one known line");
  let handler = null;
  const Deno = { env: { get: k => "test-" + k }, serve: h => { handler = h; } };
  new Function("Deno", "__mock", js)(Deno, { createClient: () => fakeSupabase(state) });
  return async (body, token) => {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) headers.set("Authorization", "Bearer " + token);
    const res = await handler(new Request("https://x/functions/v1/urus-akaun", { method: "POST", headers, body: JSON.stringify(body) }));
    return { status: res.status, body: await res.json() };
  };
}

function setup() {
  const state = {
    allow: new Map([["admin@klinik.my", true], ["staf@klinik.my", false]]),
    users: [{ id: "u0", email: "staf@klinik.my" }],
    tokens: new Map()
  };
  return { state, call: loadFunction(state) };
}

const canStrip = typeof nodeModule.stripTypeScriptTypes === "function";

test("akaun OPD: first-time setup lets a listed admin with no account set a password, once", { skip: !canStrip }, async () => {
  const { state, call } = setup();
  const r = await call({ tindakan: "mula", email: " Admin@Klinik.my ", password: "rahsia-baru-1" });
  assert.equal(r.status, 200);
  assert.ok(state.users.some(u => u.email === "admin@klinik.my"));
  const again = await call({ tindakan: "mula", email: "admin@klinik.my", password: "cuba-ambil-alih" });
  assert.equal(again.status, 403, "a second claim is refused once the account exists");
  assert.equal(state.users.find(u => u.email === "admin@klinik.my").password, "rahsia-baru-1");
});

test("akaun OPD: first-time setup is refused for staff and unlisted emails", { skip: !canStrip }, async () => {
  const { state, call } = setup();
  state.users = [];
  assert.equal((await call({ tindakan: "mula", email: "staf@klinik.my", password: "12345678" })).status, 403);
  assert.equal((await call({ tindakan: "mula", email: "orang.luar@gmail.com", password: "12345678" })).status, 403);
  assert.equal(state.users.length, 0);
});

test("akaun OPD: managing accounts needs a signed-in admin", { skip: !canStrip }, async () => {
  const { state, call } = setup();
  state.tokens.set("t-staf", "staf@klinik.my");
  assert.equal((await call({ tindakan: "senarai" })).status, 401);
  assert.equal((await call({ tindakan: "tambah", email: "baru@klinik.my", password: "12345678" }, "t-staf")).status, 403);
  assert.equal(state.users.some(u => u.email === "baru@klinik.my"), false);
  assert.equal(state.allow.has("baru@klinik.my"), false);
});

test("akaun OPD: an admin adds, lists, resets and removes staff accounts", { skip: !canStrip }, async () => {
  const { state, call } = setup();
  state.users.push({ id: "ua", email: "admin@klinik.my" });
  state.tokens.set("t-admin", "admin@klinik.my");

  assert.equal((await call({ tindakan: "tambah", email: "kaunter@klinik.my", password: "pendek" }, "t-admin")).status, 400);
  const add = await call({ tindakan: "tambah", email: "Kaunter@Klinik.my", password: "kaunter-2026" }, "t-admin");
  assert.equal(add.status, 200);
  assert.equal(state.allow.get("kaunter@klinik.my"), false, "new accounts are staff unless marked admin");

  const list = await call({ tindakan: "senarai" }, "t-admin");
  assert.equal(list.status, 200);
  const k = list.body.akaun.find(a => a.email === "kaunter@klinik.my");
  assert.equal(k.ada_akaun, true);

  assert.equal((await call({ tindakan: "kata_laluan", email: "kaunter@klinik.my", password: "kata-baru-99" }, "t-admin")).status, 200);
  assert.equal(state.users.find(u => u.email === "kaunter@klinik.my").password, "kata-baru-99");

  assert.equal((await call({ tindakan: "buang", email: "kaunter@klinik.my" }, "t-admin")).status, 200);
  assert.equal(state.allow.has("kaunter@klinik.my"), false);
  assert.equal(state.users.some(u => u.email === "kaunter@klinik.my"), false);
});

test("akaun OPD: an admin cannot remove or demote their own account", { skip: !canStrip }, async () => {
  const { state, call } = setup();
  state.users.push({ id: "ua", email: "admin@klinik.my" });
  state.tokens.set("t-admin", "admin@klinik.my");
  assert.equal((await call({ tindakan: "buang", email: "admin@klinik.my" }, "t-admin")).status, 400);
  assert.equal((await call({ tindakan: "admin", email: "admin@klinik.my", admin: false }, "t-admin")).status, 400);
  assert.equal(state.allow.get("admin@klinik.my"), true);
});

test("akaun OPD: the page checks a new email and password before sending them", () => {
  const L = require("../giliran-opd/logic.js");
  assert.equal(L.normEmail("  Kaunter@KKBangi.my "), "kaunter@kkbangi.my");
  assert.match(L.accountProblem("bukan-emel", "12345678"), /emel/i);
  assert.match(L.accountProblem("a@b.my", "1234567"), /8 aksara/);
  assert.match(L.accountProblem(undefined, "12345678", "12345679"), /tidak sama/);
  assert.equal(L.accountProblem("a@b.my", "12345678"), "");
  assert.equal(L.accountProblem(undefined, "12345678", "12345678"), "");
});

test("akaun OPD: Tetapan and the login page manage accounts through the urus-akaun function", () => {
  const dir = path.join(__dirname, "..", "giliran-opd");
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(dir, "app.js"), "utf8");
  assert.match(html, /id="acctPanel"/);
  ["adminBox", "addAcctForm", "acctList", "pwForm", "firstForm", "firstLink", "pwDlg"].forEach(id => {
    assert.match(html, new RegExp('id="' + id + '"'), id + " is on the page");
    assert.match(app, new RegExp("\\$\\('" + id + "'\\)"), id + " is wired up in app.js");
  });
  assert.match(app, /functions\.invoke\('urus-akaun'/);
  assert.doesNotMatch(app, /auth\.admin\./, "admin auth calls stay on the server");
  assert.doesNotMatch(app, /\bprompt\(/, "no browser prompt() for passwords");
});

test("akaun OPD: the website never holds the service role key", () => {
  const dir = path.join(__dirname, "..", "giliran-opd");
  ["config.js", "app.js", "index.html", "logic.js"].forEach(f => {
    const s = fs.readFileSync(path.join(dir, f), "utf8");
    assert.doesNotMatch(s, /service_role|SERVICE_ROLE/, f + " must not reference the service role key");
  });
});
