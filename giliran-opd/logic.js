/* Giliran OPD: logik agihan bilik (tiada akses rangkaian, boleh diuji dengan node --test) */
(function (root) {
  'use strict';

  const ST = { W: 'menunggu', C: 'dipanggil', D: 'selesai', N: 'tidak_hadir' };

  // Bilangan menunggu dan jumlah hari ini bagi setiap bilik dalam senarai
  function loadMap(rooms, patients) {
    const m = {};
    rooms.forEach((r, i) => { m[r.name] = { w: 0, tot: 0, i }; });
    patients.forEach(p => {
      const x = m[p.room];
      if (!x) return;
      x.tot++;
      if (p.status === ST.W) x.w++;
    });
    return m;
  }

  // Bilik buka dengan paling sedikit menunggu; seri: paling sedikit hari ini, kemudian susunan senarai
  function pickRoom(rooms, m) {
    const open = rooms.filter(r => r.open && m[r.name]);
    if (!open.length) return null;
    open.sort((a, b) =>
      m[a.name].w - m[b.name].w ||
      m[a.name].tot - m[b.name].tot ||
      m[a.name].i - m[b.name].i);
    return open[0].name;
  }

  // Rancangan pindah pesakit menunggu apabila satu bilik ditutup
  function planClose(rooms, patients, name) {
    const list = rooms.map(r => (r.name === name ? Object.assign({}, r, { open: false }) : r));
    const m = loadMap(list, patients);
    const moving = patients
      .filter(p => p.room === name && p.status === ST.W)
      .sort((a, b) => a.t - b.t);
    const moves = [];
    for (const p of moving) {
      const to = pickRoom(list, m);
      if (!to) break;
      m[to].w++;
      m[to].tot++;
      moves.push({ id: p.id, from: name, to });
    }
    return { moves, stranded: moving.length - moves.length };
  }

  // Pesakit yang sedang dipanggil dan senarai menunggu bagi satu bilik
  function roomState(patients, name) {
    const inRoom = patients.filter(p => p.room === name);
    const called = inRoom.filter(p => p.status === ST.C).sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0));
    const waiting = inRoom.filter(p => p.status === ST.W).sort((a, b) => a.t - b.t);
    return { current: called[0] || null, waiting };
  }

  function addNote(old, text) {
    return old ? old + '; ' + text : text;
  }

  // Tarikh YYYY-MM-DD dalam zon waktu Malaysia
  function dayKey(date, tz) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(date || new Date());
  }

  // Agihan hari ini: setiap bilik (ikut susunan) dengan semua nombor yang diagih ke bilik itu,
  // ikut masa daftar, tanpa mengira status
  function allocation(rooms, patients) {
    return rooms.map(r => ({
      name: r.name,
      open: r.open,
      nos: patients.filter(p => p.room === r.name).sort((a, b) => a.t - b.t).map(p => p.no)
    }));
  }

  // Semakan akaun baharu sebelum dihantar ke pelayan (pelayan menyemak semula)
  const MIN_PW = 8;
  function normEmail(v) {
    return typeof v === 'string' ? v.trim().toLowerCase() : '';
  }
  function accountProblem(email, pw, pw2) {
    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail(email))) return 'Masukkan emel yang sah (cth. kaunter@kkbangi.my).';
    if (!pw || pw.length < MIN_PW) return 'Kata laluan sekurang-kurangnya ' + MIN_PW + ' aksara.';
    if (pw2 !== undefined && pw !== pw2) return 'Kedua-dua kata laluan tidak sama.';
    return '';
  }

  const api = { ST, loadMap, pickRoom, planClose, roomState, addNote, dayKey, normEmail, accountProblem, allocation };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GiliranLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
