/* Giliran OPD: antara muka dan sambungan Supabase */
(function () {
  'use strict';

  const CFG = window.GILIRAN_CONFIG || {};
  const L = window.GiliranLogic;
  const TZ = 'Asia/Kuala_Lumpur';
  const ST = L.ST;
  const LABEL = { menunggu: 'Menunggu', dipanggil: 'Dipanggil', selesai: 'Selesai', tidak_hadir: 'Tidak hadir' };

  let sb = null;
  let started = false;
  let rooms = [], roomsLoaded = false;
  let patients = [], patientsLoaded = false;
  let dayKey = L.dayKey(new Date(), TZ);
  let channel = null, refetchTimer = null, pendingDup = null;
  let myRoom = null;
  try { myRoom = localStorage.getItem('giliran-opd-bilik'); } catch (e) { /* storan tidak tersedia */ }

  const $ = id => document.getElementById(id);

  /* ---------- Bantuan ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtTime(ms) {
    try { return new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms)); }
    catch (e) { return new Date(ms).toLocaleTimeString(); }
  }
  function fmtDate() {
    try { return new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); }
    catch (e) { return dayKey; }
  }
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
  }
  function ask(title, text, okLabel) {
    return new Promise(resolve => {
      const d = $('dlg');
      $('dlgTitle').textContent = title;
      $('dlgText').textContent = text;
      $('dlgOk').textContent = okLabel || 'Teruskan';
      const done = v => { d.close(); $('dlgOk').onclick = null; $('dlgCancel').onclick = null; resolve(v); };
      $('dlgOk').onclick = () => done(true);
      $('dlgCancel').onclick = () => done(false);
      d.oncancel = e => { e.preventDefault(); done(false); };
      try { d.showModal(); } catch (e) { resolve(false); }
    });
  }
  function setConn(state, text) {
    $('connDot').className = 'dot' + (state === 'ok' ? ' ok' : state === 'bad' ? ' bad' : '');
    $('connText').textContent = text;
  }
  function note(msg, warn) {
    const n = $('globalNote');
    if (!msg) { n.hidden = true; return; }
    n.textContent = msg;
    n.className = 'notice' + (warn ? ' warn' : '');
    n.hidden = false;
  }
  function handleErr(e) {
    const code = e && (e.code || e.status);
    if (code === '42P01' || code === 'PGRST205') note('Jadual pangkalan data belum dibuat. Jalankan fail setup.sql dalam Supabase (rujuk README).', true);
    else if (code === 401 || code === 403 || code === '42501' || code === 'PGRST301') { note('Sesi tamat. Sila log masuk semula.', true); showLogin(); }
    else toast('Tidak dapat simpan atau muat data. Cuba sekali lagi.');
  }
  async function run(query) {
    const { error } = await query;
    if (error) throw error;
  }

  /* ---------- Data ---------- */
  async function fetchRooms() {
    const { data, error } = await sb.from('giliran_bilik').select('nama,buka,susunan').order('susunan').order('nama');
    if (error) throw error;
    rooms = data.map(r => ({ name: r.nama, open: r.buka, order: r.susunan }));
    roomsLoaded = true;
  }
  async function fetchPatients() {
    const { data, error } = await sb.from('giliran_pesakit')
      .select('id,no,bilik,status,masa_daftar,masa_panggil,catatan')
      .eq('tarikh', dayKey).order('masa_daftar');
    if (error) throw error;
    patients = data.map(p => ({
      id: p.id, no: p.no, room: p.bilik, status: p.status,
      t: Date.parse(p.masa_daftar), calledAt: p.masa_panggil ? Date.parse(p.masa_panggil) : null, note: p.catatan || ''
    }));
    patientsLoaded = true;
  }
  async function refresh() {
    if (!started) return;
    try {
      await Promise.all([fetchRooms(), fetchPatients()]);
      setConn('ok', 'Live');
      if (!rooms.length) note('Tiada bilik dipaparkan. Jika ini kali pertama akaun ini digunakan, minta pentadbir tambah emel akaun ke senarai akaun dibenarkan.', true);
      else note('');
    } catch (e) {
      setConn('bad', 'Terputus');
      handleErr(e);
    }
    render();
  }
  function scheduleRefresh() {
    clearTimeout(refetchTimer);
    refetchTimer = setTimeout(refresh, 150);
  }
  function subscribe() {
    if (channel) sb.removeChannel(channel);
    channel = sb.channel('giliran-opd')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'giliran_pesakit' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'giliran_bilik' }, scheduleRefresh)
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setConn('ok', 'Live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConn('bad', 'Semak sambungan');
      });
  }

  /* ---------- Paparan ---------- */
  const VIEWS = ['kaunter', 'doktor', 'tetapan'];
  function currentView() { const h = location.hash.replace('#', ''); return VIEWS.includes(h) ? h : 'kaunter'; }
  function showView() {
    const v = currentView();
    document.querySelectorAll('[data-view-panel]').forEach(s => { s.hidden = !started || s.dataset.viewPanel !== v; });
    document.querySelectorAll('nav.tabs a').forEach(a => {
      if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', showView);

  function counts() {
    const c = { tot: patients.length, w: 0, c: 0, d: 0, n: 0 };
    patients.forEach(p => {
      if (p.status === ST.W) c.w++; else if (p.status === ST.C) c.c++;
      else if (p.status === ST.D) c.d++; else if (p.status === ST.N) c.n++;
    });
    return c;
  }
  function roomOptions(selected, withAuto) {
    let h = withAuto ? '<option value="">Auto (paling kurang menunggu)</option>' : '';
    const names = rooms.map(r => r.name);
    if (selected && !names.includes(selected)) names.push(selected);
    names.forEach(n => {
      const r = rooms.find(x => x.name === n);
      const closed = r && !r.open ? ' (tutup)' : '';
      h += '<option value="' + esc(n) + '"' + (n === selected ? ' selected' : '') + '>' + esc(n) + closed + '</option>';
    });
    return h;
  }
  function renderStats() {
    const c = counts();
    $('stats').innerHTML =
      '<div class="stat"><b>' + c.tot + '</b><span>Didaftar</span></div>' +
      '<div class="stat w"><b>' + c.w + '</b><span>Menunggu</span></div>' +
      '<div class="stat c"><b>' + c.c + '</b><span>Dipanggil</span></div>' +
      '<div class="stat"><b>' + c.d + '</b><span>Selesai</span></div>' +
      '<div class="stat"><b>' + c.n + '</b><span>Tidak hadir</span></div>';
  }
  function renderRoomGrid() {
    const m = L.loadMap(rooms, patients);
    $('roomsEmpty').hidden = !roomsLoaded || rooms.length > 0;
    $('roomGrid').innerHTML = rooms.map(r => {
      const x = m[r.name];
      return '<div class="tile' + (r.open ? '' : ' closed') + '">' +
        '<span class="code">' + esc(r.name) + '</span>' +
        '<span class="wait"><b>' + x.w + '</b> menunggu · ' + x.tot + ' hari ini</span>' +
        '<button class="switch" role="switch" aria-checked="' + r.open + '" data-room="' + esc(r.name) + '" aria-label="Bilik ' + esc(r.name) + ' buka"><span class="track"></span>' + (r.open ? 'Buka' : 'Tutup') + '</button>' +
        '</div>';
    }).join('');
    const sel = $('roomOverride');
    const v = sel.value;
    sel.innerHTML = roomOptions(v, true);
  }
  function renderToday() {
    const q = $('search').value.trim().toUpperCase();
    const list = patients.slice().sort((a, b) => b.t - a.t).filter(p => !q || String(p.no).toUpperCase().includes(q));
    const empty = $('todayEmpty');
    empty.hidden = patientsLoaded && patients.length > 0;
    empty.textContent = patientsLoaded ? 'Belum ada pesakit didaftar hari ini. Taip nombor PreQ di atas untuk mula.' : 'Memuatkan senarai hari ini...';
    $('todayBody').innerHTML = list.map(p =>
      '<tr class="s-' + p.status + '"><td class="no">' + esc(p.no) + '</td>' +
      '<td><select data-act="room" data-id="' + p.id + '" aria-label="Bilik ' + esc(p.no) + '">' + roomOptions(p.room, false) + '</select></td>' +
      '<td><select data-act="status" data-id="' + p.id + '" aria-label="Status ' + esc(p.no) + '">' +
      Object.keys(LABEL).map(k => '<option value="' + k + '"' + (k === p.status ? ' selected' : '') + '>' + LABEL[k] + '</option>').join('') + '</select></td>' +
      '<td>' + fmtTime(p.t) + '</td><td class="note">' + esc(p.note) + '</td>' +
      '<td><button class="iconbtn" data-act="del" data-id="' + p.id + '" aria-label="Padam ' + esc(p.no) + '">&times;</button></td></tr>'
    ).join('');
  }
  function renderDoctor() {
    $('picker').innerHTML = rooms.map(r =>
      '<button type="button" class="' + (r.open ? '' : 'closed') + '" aria-pressed="' + (r.name === myRoom) + '" data-pick="' + esc(r.name) + '">' + esc(r.name) + '</button>'
    ).join('') || '<span class="empty">Belum ada bilik.</span>';
    const has = myRoom && rooms.some(r => r.name === myRoom);
    $('myRoomPanel').hidden = !has;
    if (has) {
      const s = L.roomState(patients, myRoom);
      $('nowLabel').textContent = 'Bilik ' + myRoom + ' · sedang dipanggil';
      const nowNo = $('nowNo');
      if (s.current) { nowNo.textContent = s.current.no; nowNo.className = 'current'; }
      else { nowNo.textContent = 'Tiada'; nowNo.className = 'current none'; }
      $('myWaitCount').textContent = '(' + s.waiting.length + ')';
      $('myQueue').innerHTML = s.waiting.map(p => '<span class="q">' + esc(p.no) + '</span>').join('');
      $('myQueueEmpty').hidden = s.waiting.length > 0;
      $('callNext').disabled = !s.waiting.length && !s.current;
      $('markDone').disabled = !s.current;
      $('markAbsent').disabled = !s.current;
    }
    $('board').innerHTML = rooms.map(r => {
      const s = L.roomState(patients, r.name);
      const nexts = s.waiting.slice(0, 6).map(p => esc(p.no)).join(' · ');
      return '<div class="bcard' + (r.open ? '' : ' closed') + '"><div class="top"><span class="code">' + esc(r.name) + '</span>' +
        '<span class="chip' + (r.open ? ' menunggu' : '') + '">' + (r.open ? s.waiting.length + ' menunggu' : 'Tutup') + '</span></div>' +
        '<div class="calling">Dipanggil: <b>' + (s.current ? esc(s.current.no) : '-') + '</b></div>' +
        '<div class="nexts">' + (nexts || '<span style="color:var(--muted);font-family:var(--font-body);font-size:13px;font-weight:400">Tiada menunggu</span>') + '</div></div>';
    }).join('');
  }
  function renderSettings() {
    $('rlist').innerHTML = rooms.map((r, i) =>
      '<div class="ritem"><span class="code">' + esc(r.name) + '</span><span class="grow" style="font-size:13px;color:var(--muted)">' + (r.open ? 'Buka' : 'Tutup') + '</span>' +
      '<button class="iconbtn" data-up="' + i + '" aria-label="Naikkan ' + esc(r.name) + '"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
      '<button class="iconbtn" data-rm="' + esc(r.name) + '" aria-label="Buang bilik ' + esc(r.name) + '">&times;</button></div>'
    ).join('') || '<div class="empty">Belum ada bilik.</div>';
  }
  function render() {
    $('dateLabel').textContent = fmtDate();
    if (!started) return;
    renderStats(); renderRoomGrid(); renderToday(); renderDoctor(); renderSettings();
  }

  /* ---------- Tindakan ---------- */
  async function register(no, override, force) {
    $('regErr').hidden = true;
    $('dupBox').hidden = true;
    if (!no) { $('regErr').textContent = 'Taip nombor giliran dahulu.'; $('regErr').hidden = false; return; }
    const dup = patients.find(p => String(p.no).toUpperCase() === no);
    if (dup && !force) {
      pendingDup = { no, override };
      $('dupBox').innerHTML = '<div>Nombor <b>' + esc(no) + '</b> sudah didaftar ke bilik <b>' + esc(dup.room) + '</b> pada ' + fmtTime(dup.t) + '.</div>' +
        '<div class="row"><button class="btn" type="button" id="dupCancel">Batal</button><button class="btn primary" type="button" id="dupGo">Daftar juga</button></div>';
      $('dupBox').hidden = false;
      $('dupGo').onclick = () => { const d = pendingDup; pendingDup = null; register(d.no, d.override, true); };
      $('dupCancel').onclick = () => { pendingDup = null; $('dupBox').hidden = true; $('noInput').select(); };
      return;
    }
    const room = override || L.pickRoom(rooms, L.loadMap(rooms, patients));
    if (!room) { $('regErr').textContent = 'Semua bilik tutup. Buka satu bilik atau pilih bilik secara manual.'; $('regErr').hidden = false; return; }
    $('regBtn').disabled = true;
    try {
      await run(sb.from('giliran_pesakit').insert({
        tarikh: dayKey, no, bilik: room, status: ST.W, catatan: override ? 'Bilik dipilih manual' : ''
      }));
      const r = $('resultBox');
      r.innerHTML = '<span class="big-no num">' + esc(no) + '</span><span class="arrow">&rarr;</span><span class="room num">Bilik ' + esc(room) + '</span>' +
        '<span class="sub">' + (override ? 'Bilik dipilih manual' : 'Dipilih automatik') + ' · ' + fmtTime(Date.now()) + '</span>';
      r.hidden = false;
      $('noInput').value = '';
      $('roomOverride').value = '';
      $('noInput').focus();
      await refresh();
    } catch (e) { handleErr(e); }
    finally { $('regBtn').disabled = false; }
  }

  async function setRoomOpen(name, open) {
    if (!open) {
      const waiting = patients.filter(p => p.room === name && p.status === ST.W).length;
      const ok = await ask('Tutup bilik ' + name + '?', waiting
        ? waiting + ' pesakit yang masih menunggu akan dipindah ke bilik lain yang buka.'
        : 'Tiada pesakit menunggu di bilik ini. Pesakit baharu tidak akan dihantar ke sini.', 'Tutup bilik');
      if (!ok) { render(); return; }
    }
    try {
      await run(sb.from('giliran_bilik').update({ buka: open }).eq('nama', name));
      if (!open) {
        const plan = L.planClose(rooms, patients, name);
        for (const mv of plan.moves) {
          const p = patients.find(x => x.id === mv.id);
          await run(sb.from('giliran_pesakit').update({ bilik: mv.to, catatan: L.addNote(p ? p.note : '', 'Dipindah dari ' + name) }).eq('id', mv.id));
        }
        toast('Bilik ' + name + ' ditutup.' + (plan.moves.length ? ' ' + plan.moves.length + ' pesakit dipindah.' : '') +
          (plan.stranded ? ' ' + plan.stranded + ' pesakit masih di bilik ini kerana tiada bilik lain yang buka.' : ''));
      } else {
        toast('Bilik ' + name + ' dibuka.');
      }
    } catch (e) { handleErr(e); }
    await refresh();
  }

  async function callNext() {
    const s = L.roomState(patients, myRoom);
    try {
      if (s.current) await run(sb.from('giliran_pesakit').update({ status: ST.D }).eq('id', s.current.id));
      const next = s.waiting[0];
      if (next) await run(sb.from('giliran_pesakit').update({ status: ST.C, masa_panggil: new Date().toISOString() }).eq('id', next.id));
      else toast('Tiada pesakit menunggu di bilik ' + myRoom + '.');
    } catch (e) { handleErr(e); }
    await refresh();
  }
  async function markCurrent(status) {
    const s = L.roomState(patients, myRoom);
    if (!s.current) return;
    try { await run(sb.from('giliran_pesakit').update({ status }).eq('id', s.current.id)); } catch (e) { handleErr(e); }
    await refresh();
  }

  async function saveRoomOrder(list) {
    try {
      await run(sb.from('giliran_bilik').upsert(list.map((r, i) => ({ nama: r.name, buka: r.open, susunan: i + 1 }))));
    } catch (e) { handleErr(e); }
    await refresh();
  }

  async function cleanup() {
    const ok = await ask('Padam rekod lama?', 'Rekod pesakit yang lebih 30 hari akan dipadam terus dan tidak boleh dipulihkan.', 'Padam');
    if (!ok) return;
    const cutoff = L.dayKey(new Date(Date.now() - 30 * 864e5), TZ);
    $('cleanupBtn').disabled = true;
    try {
      const { error, count } = await sb.from('giliran_pesakit').delete({ count: 'exact' }).lt('tarikh', cutoff);
      if (error) throw error;
      $('cleanupMsg').textContent = count ? count + ' rekod lama dipadam.' : 'Tiada rekod lebih 30 hari.';
    } catch (e) { handleErr(e); }
    finally { $('cleanupBtn').disabled = false; }
  }

  /* ---------- Acara ---------- */
  $('regForm').addEventListener('submit', e => {
    e.preventDefault();
    register($('noInput').value.trim().toUpperCase().replace(/\s+/g, ''), $('roomOverride').value, false);
  });
  $('search').addEventListener('input', renderToday);
  $('roomGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-room]');
    if (b) setRoomOpen(b.dataset.room, b.getAttribute('aria-checked') !== 'true');
  });
  $('todayBody').addEventListener('change', async e => {
    const el = e.target;
    const id = el.dataset.id;
    const p = patients.find(x => x.id === id);
    if (!p) return;
    try {
      if (el.dataset.act === 'status') {
        const upd = { status: el.value };
        if (el.value === ST.C && !p.calledAt) upd.masa_panggil = new Date().toISOString();
        await run(sb.from('giliran_pesakit').update(upd).eq('id', id));
      } else if (el.dataset.act === 'room') {
        await run(sb.from('giliran_pesakit').update({ bilik: el.value, catatan: L.addNote(p.note, 'Ditukar manual dari ' + p.room) }).eq('id', id));
      }
    } catch (err) { handleErr(err); }
    await refresh();
  });
  $('todayBody').addEventListener('click', async e => {
    const b = e.target.closest('[data-act="del"]');
    if (!b) return;
    const p = patients.find(x => x.id === b.dataset.id);
    if (!p) return;
    if (!(await ask('Padam nombor ' + p.no + '?', 'Rekod ini dibuang daripada senarai hari ini.', 'Padam'))) return;
    try { await run(sb.from('giliran_pesakit').delete().eq('id', p.id)); toast('Nombor ' + p.no + ' dipadam.'); } catch (err) { handleErr(err); }
    await refresh();
  });
  $('picker').addEventListener('click', e => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    myRoom = b.dataset.pick;
    try { localStorage.setItem('giliran-opd-bilik', myRoom); } catch (err) { /* abaikan */ }
    renderDoctor();
  });
  $('callNext').addEventListener('click', callNext);
  $('markDone').addEventListener('click', () => markCurrent(ST.D));
  $('markAbsent').addEventListener('click', () => markCurrent(ST.N));
  $('addRoomForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('newRoom').value.trim().toUpperCase();
    if (!name) return;
    if (rooms.some(r => r.name === name)) { toast('Bilik ' + name + ' sudah ada.'); return; }
    $('newRoom').value = '';
    await saveRoomOrder(rooms.concat([{ name, open: true }]));
  });
  $('rlist').addEventListener('click', async e => {
    const up = e.target.closest('[data-up]');
    const rm = e.target.closest('[data-rm]');
    const list = rooms.map(r => ({ name: r.name, open: r.open }));
    if (up) {
      const i = Number(up.dataset.up);
      if (i < 1) return;
      const t = list[i - 1]; list[i - 1] = list[i]; list[i] = t;
      await saveRoomOrder(list);
    } else if (rm) {
      const name = rm.dataset.rm;
      const waiting = patients.filter(p => p.room === name && p.status === ST.W).length;
      if (!(await ask('Buang bilik ' + name + '?', waiting
        ? 'Bilik ini masih ada ' + waiting + ' pesakit menunggu. Tutup bilik dahulu supaya mereka dipindah.'
        : 'Bilik ini dibuang daripada senarai.', 'Buang'))) return;
      try { await run(sb.from('giliran_bilik').delete().eq('nama', name)); } catch (err) { handleErr(err); }
      await refresh();
    }
  });
  $('cleanupBtn').addEventListener('click', cleanup);
  $('logoutBtn').addEventListener('click', async () => {
    if (!(await ask('Log keluar?', 'Hanya peranti ini dilog keluar. Peranti lain yang guna akaun sama tidak terjejas.', 'Log keluar'))) return;
    await sb.auth.signOut({ scope: 'local' });
  });

  /* ---------- Log masuk dan mula ---------- */
  function savedEmail() {
    if (CFG.LOGIN_EMAIL) return CFG.LOGIN_EMAIL;
    try { return localStorage.getItem('giliran-opd-emel') || ''; } catch (e) { return ''; }
  }
  function showLogin() {
    started = false;
    $('tabs').hidden = true;
    $('loginView').hidden = false;
    $('emailRow').hidden = !!CFG.LOGIN_EMAIL;
    if (!CFG.LOGIN_EMAIL && !$('emailInput').value) $('emailInput').value = savedEmail();
    showView();
    setConn('', 'Belum log masuk');
    setTimeout(() => ($('emailRow').hidden || $('emailInput').value ? $('pwInput') : $('emailInput')).focus(), 50);
  }
  function startApp() {
    if (started) return;
    started = true;
    $('loginView').hidden = true;
    $('tabs').hidden = false;
    note('');
    showView();
    render();
    subscribe();
    refresh();
  }
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('loginErr').hidden = true;
    $('loginBtn').disabled = true;
    const email = (CFG.LOGIN_EMAIL || $('emailInput').value).trim();
    const { error } = await sb.auth.signInWithPassword({ email, password: $('pwInput').value });
    $('loginBtn').disabled = false;
    if (error) { $('loginErr').textContent = 'Emel atau kata laluan salah. Cuba sekali lagi.'; $('loginErr').hidden = false; return; }
    try { if (!CFG.LOGIN_EMAIL) localStorage.setItem('giliran-opd-emel', email); } catch (err) { /* abaikan */ }
    $('pwInput').value = '';
    startApp();
  });

  function configured() {
    const v = [CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY];
    return v.every(x => typeof x === 'string' && x.trim() && !x.includes('GANTI'));
  }

  render();
  if (!configured() || !window.supabase) {
    setConn('bad', 'Belum disambung');
    note(!window.supabase
      ? 'Perpustakaan Supabase tidak dapat dimuat. Semak sambungan internet.'
      : 'Sistem belum disambung ke pangkalan data. Lengkapkan fail config.js (rujuk README).', true);
    return;
  }
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') showLogin(); });
  sb.auth.getSession().then(({ data }) => { if (data && data.session) startApp(); else showLogin(); });

  setInterval(() => { if (started) refresh(); }, 20000);
  setInterval(() => {
    const k = L.dayKey(new Date(), TZ);
    if (k !== dayKey) { dayKey = k; patients = []; patientsLoaded = false; refresh(); }
  }, 60000);
})();
