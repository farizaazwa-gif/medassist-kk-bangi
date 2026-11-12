/* Tetapan sambungan Supabase untuk Giliran OPD (projek: giliran-opd).
 * Anon key memang selamat diletak di sini: data dilindungi oleh Row Level Security,
 * dan hanya akaun yang emelnya ada dalam jadual giliran_akaun boleh baca atau ubah.
 * LOGIN_EMAIL pilihan: isi untuk sorok ruangan emel di skrin log masuk.
 */
window.GILIRAN_CONFIG = {
  SUPABASE_URL: 'https://wkuogxzwnkykwnpdcmwv.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW9neHp3bmt5a3ducGRjbXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODAxMzcsImV4cCI6MjExMDA1NjEzN30.XpzR8mWPM7sQZIl5GATiNDtZpu3d9QTcR9IiSn6BkO8',
  LOGIN_EMAIL: ''
};
