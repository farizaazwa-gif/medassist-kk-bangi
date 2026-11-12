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

## Pangkalan data

Projek Supabase `giliran-opd` (Singapura) sudah disediakan dengan `setup.sql`.

### Tambah akaun klinik

1. Supabase > Authentication > Users > Add user > Create new user. Isi emel dan kata laluan klinik, tanda *Auto Confirm User*.
2. Benarkan emel itu. Supabase > SQL Editor:

   ```sql
   insert into public.giliran_akaun (email) values ('emel.akaun@contoh.com');
   ```

Akaun yang tiada dalam `giliran_akaun` boleh log masuk tetapi tidak nampak atau ubah apa-apa data.

### Disyorkan

Authentication > Sign In / Providers: matikan *Allow new users to sign up*, supaya akaun baharu hanya boleh dibuat oleh pentadbir.

## Data

- Hanya nombor giliran disimpan, bukan nama atau No. KP pesakit.
- Senarai bermula kosong setiap hari (ikut tarikh Malaysia).
- Tab Tetapan ada butang untuk padam rekod lebih 30 hari.
- Projek Supabase percuma dijeda selepas 7 hari tanpa digunakan. Guna harian di klinik memastikan ia kekal aktif. Jika dijeda, pulihkan di dashboard Supabase.
- Tukar kata laluan klinik di Authentication > Users jika ia tersebar.
