/* Tetapan sambungan Supabase untuk Giliran OPD.
 * Ganti tiga nilai di bawah selepas projek Supabase disediakan (rujuk README.md).
 * Anon key memang selamat diletak di sini: data dilindungi oleh Row Level Security
 * dan hanya akaun klinik yang log masuk boleh baca atau ubah.
 */
window.GILIRAN_CONFIG = {
  SUPABASE_URL: 'GANTI_DENGAN_PROJECT_URL',
  SUPABASE_ANON_KEY: 'GANTI_DENGAN_ANON_KEY',
  LOGIN_EMAIL: 'GANTI_DENGAN_EMEL_AKAUN_KLINIK'
};
