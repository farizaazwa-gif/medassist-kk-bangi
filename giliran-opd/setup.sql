-- Giliran OPD: jadual Supabase
-- Jalankan sekali dalam Supabase > SQL Editor > New query > Run.
-- Selamat dijalankan semula: jadual dan bilik sedia ada tidak ditindih.

create extension if not exists pgcrypto;

create table if not exists public.giliran_bilik (
  nama     text primary key,
  buka     boolean not null default true,
  susunan  integer not null default 0
);

create table if not exists public.giliran_pesakit (
  id            uuid primary key default gen_random_uuid(),
  tarikh        date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,
  no            text not null,
  bilik         text,
  status        text not null default 'menunggu'
                check (status in ('menunggu', 'dipanggil', 'selesai', 'tidak_hadir')),
  masa_daftar   timestamptz not null default now(),
  masa_panggil  timestamptz,
  catatan       text not null default ''
);

create index if not exists giliran_pesakit_tarikh_idx on public.giliran_pesakit (tarikh);

-- Senarai emel akaun yang dibenarkan. Tiada akses terus dari laman (tiada polisi).
create table if not exists public.giliran_akaun (
  email text primary key
);
alter table public.giliran_akaun enable row level security;

-- Semakan akses, dalam skema yang tidak didedahkan melalui API
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.giliran_dibenarkan()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.giliran_akaun
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function private.giliran_dibenarkan() from public, anon;
grant execute on function private.giliran_dibenarkan() to authenticated;

-- Hanya akaun yang log masuk DAN ada dalam giliran_akaun boleh baca dan ubah
alter table public.giliran_bilik   enable row level security;
alter table public.giliran_pesakit enable row level security;

drop policy if exists "akaun klinik urus bilik" on public.giliran_bilik;
create policy "akaun klinik urus bilik" on public.giliran_bilik
  for all to authenticated
  using (private.giliran_dibenarkan()) with check (private.giliran_dibenarkan());

drop policy if exists "akaun klinik urus pesakit" on public.giliran_pesakit;
create policy "akaun klinik urus pesakit" on public.giliran_pesakit
  for all to authenticated
  using (private.giliran_dibenarkan()) with check (private.giliran_dibenarkan());

-- Kemas kini live antara skrin
do $$
begin
  begin
    alter publication supabase_realtime add table public.giliran_bilik;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.giliran_pesakit;
  exception when duplicate_object then null;
  end;
end $$;

-- Senarai bilik OPD
insert into public.giliran_bilik (nama, buka, susunan) values
  ('1A', true, 1),  ('1B', true, 2),  ('1C', true, 3),
  ('2A', true, 4),  ('2B', true, 5),  ('2C', true, 6),
  ('3A', true, 7),  ('3B', true, 8),  ('3C', true, 9),
  ('4A', true, 10), ('4B', true, 11), ('4C', true, 12),
  ('8A', true, 13), ('8B', true, 14), ('8C', true, 15),
  ('9A', true, 16), ('9B', true, 17)
on conflict (nama) do nothing;
