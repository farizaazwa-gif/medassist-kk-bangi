# Giliran OPD

Staf kaunter taip nombor PreQ, dan sistem terus pilih bilik doktor yang buka dengan paling sedikit pesakit menunggu. Bilik boleh ditukar manual, dan bila satu bilik ditutup, pesakit yang masih menunggu di bilik itu dipindah ke bilik lain. Semua skrin dikemas kini secara live.

Laman: `https://farizaazwa-gif.github.io/medassist-kk-bangi/giliran-opd/`

## Fail

| Fail | Kegunaan |
| --- | --- |
| `index.html` | Halaman (tab Kaunter, Bilik doktor, Tetapan) |
| `app.js` | Antara muka dan sambungan Supabase |
| `logic.js` | Logik agihan bilik (diuji dalam `tests/giliran-opd.test.cjs`) |
| `config.js` | URL dan anon key Supabase, serta emel akaun klinik |
| `setup.sql` | Jadual, Row Level Security, realtime dan 17 bilik OPD |

## Sediakan sekali

1. **Projek Supabase.** Guna projek sedia ada atau buat projek baharu (pelan percuma).
2. **Jadual.** Supabase > SQL Editor > New query. Tampal isi `setup.sql`, kemudian Run.
3. **Akaun klinik.** Authentication > Users > Add user > Create new user. Isi emel (contoh emel unit) dan kata laluan klinik, tanda *Auto Confirm User*.
4. **Sambungan.** Project Settings > API. Salin *Project URL* dan *anon public key* ke dalam `config.js`, bersama emel akaun klinik tadi.

Staf hanya perlu kata laluan klinik untuk log masuk, sekali bagi setiap peranti.

## Data

- Hanya nombor giliran disimpan, bukan nama atau No. KP pesakit.
- Senarai bermula kosong setiap hari (ikut tarikh Malaysia).
- Tab Tetapan ada butang untuk padam rekod lebih 30 hari.
- Tukar kata laluan klinik di Authentication > Users jika ia tersebar.
