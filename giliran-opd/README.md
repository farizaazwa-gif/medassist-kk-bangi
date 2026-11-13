# Giliran OPD

Staf kaunter taip nombor PreQ, dan sistem terus pilih bilik doktor yang buka dengan paling sedikit pesakit menunggu. Bilik boleh ditukar manual, dan bila satu bilik ditutup, pesakit yang masih menunggu di bilik itu dipindah ke bilik lain. Semua skrin dikemas kini secara live.

Laman: `https://farizaazwa-gif.github.io/medassist-kk-bangi/giliran-opd/`

## Fail

| Fail | Kegunaan |
| --- | --- |
| `index.html` | Halaman (tab Kaunter, Bilik doktor, Tetapan) |
| `app.js` | Antara muka dan sambungan Supabase |
| `logic.js` | Logik agihan bilik (diuji dalam `tests/giliran-opd.test.js`) |
| `config.js` | URL dan anon key projek Supabase `giliran-opd` |
| `setup.sql` | Jadual, Row Level Security, senarai akaun dibenarkan, realtime dan 17 bilik OPD |
| `supabase/functions/urus-akaun/index.ts` | Edge Function untuk tambah, buang dan set semula kata laluan akaun (diuji dalam `tests/giliran-opd-akaun.test.js`) |

## Pangkalan data

Projek Supabase `giliran-opd` (Singapura) sudah disediakan dengan `setup.sql`.

### Akaun pengguna

Semua dibuat dalam website, tidak perlu buka Supabase.

- **Kali pertama (pentadbir):** halaman log masuk > *Kali pertama? Cipta kata laluan*. Hanya untuk emel pentadbir yang sudah ada dalam `giliran_akaun` tetapi belum ada akaun, dan hanya sekali.
- **Tambah staf:** pentadbir buka Tetapan > Akaun pengguna, taip emel (ID log masuk) dan kata laluan sementara, tekan *Tambah akaun*. Tiada emel dihantar, jadi emel tidak perlu wujud.
- **Satu akaun dikongsi atau satu akaun setiap staf:** kedua-duanya boleh. Satu akaun boleh dibuka di banyak peranti serentak.
- **Lupa kata laluan:** pentadbir tekan *Set semula kata laluan* pada akaun itu.
- **Staf berhenti:** pentadbir tekan *Buang*. Akaun tidak boleh log masuk lagi.
- Pentadbir tidak boleh buang atau turunkan peranan akaun sendiri, jadi sentiasa ada sekurang-kurangnya seorang pentadbir.

Akaun yang tiada dalam `giliran_akaun` boleh log masuk tetapi tidak nampak atau ubah apa-apa data.

### Disyorkan

Authentication > Sign In / Providers: matikan *Allow new users to sign up*. Akaun dari tab Tetapan tetap boleh dibuat kerana ia dicipta oleh Edge Function.

## Data

- Hanya nombor giliran disimpan, bukan nama atau No. KP pesakit.
- Senarai bermula kosong setiap hari (ikut tarikh Malaysia).
- Tab Tetapan ada butang untuk padam rekod lebih 30 hari.
- Projek Supabase percuma dijeda selepas 7 hari tanpa digunakan. Guna harian di klinik memastikan ia kekal aktif. Jika dijeda, pulihkan di dashboard Supabase.
- Jika kata laluan tersebar, tukar di Tetapan > Akaun pengguna.
