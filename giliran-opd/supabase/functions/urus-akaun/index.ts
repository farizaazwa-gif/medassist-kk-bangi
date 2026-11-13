// Giliran OPD: urus akaun pengguna (Supabase Edge Function "urus-akaun").
//
// Dipanggil dari tab Tetapan dan halaman log masuk. Kunci service role hanya
// wujud di sini (pelayan Supabase), tidak pernah dalam website.
//
//   senarai      pentadbir sahaja: senarai akaun yang dibenarkan
//   tambah       pentadbir sahaja: cipta akaun (emel + kata laluan) dan benarkan
//   kata_laluan  pentadbir sahaja: set semula kata laluan akaun lain
//   admin        pentadbir sahaja: jadikan / buang peranan pentadbir
//   buang        pentadbir sahaja: buang akaun
//   mula         tanpa log masuk: pentadbir yang emelnya sudah disenaraikan
//                tetapi belum ada akaun boleh cipta kata laluan sendiri, sekali.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MIN_PW = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function fail(msg: string, status = 400) {
  return json({ ralat: msg }, status);
}
function normEmail(v: unknown) {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}
function authMessage(e: { code?: string; message?: string }) {
  const code = e.code || "";
  if (code === "weak_password") return "Kata laluan terlalu lemah. Guna sekurang-kurangnya 8 aksara.";
  if (code === "email_exists" || code === "user_already_exists") return "Emel ini sudah ada akaun.";
  if (code === "email_address_invalid" || code === "validation_failed") return "Emel tidak sah.";
  return "Tidak dapat simpan akaun. Cuba sekali lagi.";
}

type AuthUser = { id: string; email?: string; last_sign_in_at?: string | null };
async function allUsers(): Promise<AuthUser[]> {
  const out: AuthUser[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 200) break;
  }
  return out;
}
async function findUser(email: string) {
  return (await allUsers()).find((u) => normEmail(u.email) === email) || null;
}
async function allowRow(email: string) {
  const { data, error } = await sb.from("giliran_akaun").select("email,admin").eq("email", email).maybeSingle();
  if (error) throw error;
  return data as { email: string; admin: boolean } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("Kaedah tidak disokong.", 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* badan kosong */ }
  const tindakan = String(body.tindakan || "");
  const email = normEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  try {
    // Kali pertama: hanya untuk pentadbir yang disenaraikan dan belum ada akaun.
    if (tindakan === "mula") {
      if (!EMAIL_RE.test(email)) return fail("Emel tidak sah.");
      if (password.length < MIN_PW) return fail("Kata laluan sekurang-kurangnya 8 aksara.");
      const row = await allowRow(email);
      if (!row || !row.admin || (await findUser(email))) {
        return fail("Emel ini tidak boleh cipta akaun di sini. Jika sudah ada akaun, log masuk seperti biasa. Jika belum, minta pentadbir tambah akaun anda di Tetapan.", 403);
      }
      const { error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) return fail(authMessage(error));
      return json({ ok: true });
    }

    // Selain itu: pemanggil mesti log masuk dan pentadbir.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: who, error: whoErr } = await sb.auth.getUser(token);
    const caller = normEmail(who?.user?.email);
    if (whoErr || !caller) return fail("Sila log masuk semula.", 401);
    const me = await allowRow(caller);
    if (!me || !me.admin) return fail("Hanya pentadbir boleh urus akaun.", 403);

    if (tindakan === "senarai") {
      const [{ data: rows, error }, users] = await Promise.all([
        sb.from("giliran_akaun").select("email,admin").order("email"),
        allUsers(),
      ]);
      if (error) throw error;
      const byEmail = new Map(users.map((u) => [normEmail(u.email), u]));
      return json({
        saya: caller,
        akaun: (rows || []).map((r: { email: string; admin: boolean }) => {
          const u = byEmail.get(r.email);
          return { email: r.email, admin: r.admin, ada_akaun: !!u, log_masuk_terakhir: u?.last_sign_in_at || null };
        }),
      });
    }

    if (!EMAIL_RE.test(email)) return fail("Emel tidak sah.");
    if (email === caller && tindakan !== "kata_laluan") {
      return fail("Anda tidak boleh tambah, buang atau tukar peranan akaun sendiri.");
    }

    if (tindakan === "tambah") {
      if (password.length < MIN_PW) return fail("Kata laluan sekurang-kurangnya 8 aksara.");
      const existing = await findUser(email);
      if (!existing) {
        const { error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) return fail(authMessage(error));
      }
      const { error } = await sb.from("giliran_akaun").upsert({ email, admin: body.admin === true });
      if (error) throw error;
      return json({ ok: true, sedia_ada: !!existing });
    }

    if (tindakan === "kata_laluan") {
      if (password.length < MIN_PW) return fail("Kata laluan sekurang-kurangnya 8 aksara.");
      if (!(await allowRow(email))) return fail("Akaun ini tiada dalam senarai.", 404);
      const u = await findUser(email);
      if (!u) return fail("Akaun ini belum wujud.", 404);
      const { error } = await sb.auth.admin.updateUserById(u.id, { password });
      if (error) return fail(authMessage(error));
      return json({ ok: true });
    }

    if (tindakan === "admin") {
      const { error } = await sb.from("giliran_akaun").update({ admin: body.admin === true }).eq("email", email);
      if (error) throw error;
      return json({ ok: true });
    }

    if (tindakan === "buang") {
      const { error } = await sb.from("giliran_akaun").delete().eq("email", email);
      if (error) throw error;
      const u = await findUser(email);
      if (u) {
        const { error: delErr } = await sb.auth.admin.deleteUser(u.id);
        if (delErr) throw delErr;
      }
      return json({ ok: true });
    }

    return fail("Tindakan tidak dikenali.");
  } catch (e) {
    console.error("urus-akaun", tindakan, e);
    return fail("Ralat pelayan. Cuba sekali lagi.", 500);
  }
});
