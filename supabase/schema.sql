-- Run this ONCE in Supabase → SQL Editor (paste all, click Run).
-- Sets up the shared realtime board + the photos/memes wall.
-- No login: open access, fine for a 2-person private app.

-- 1) Shared app state: votes + plans (+ per-plan comments) as one JSON row -----
create table if not exists public.trip_state (
  id text primary key,
  votes jsonb default '{}'::jsonb,
  plans jsonb default '{}'::jsonb,
  last_client text,
  updated_at timestamptz default now()
);
insert into public.trip_state (id) values ('shared') on conflict (id) do nothing;

alter table public.trip_state enable row level security;
drop policy if exists "trip_state anon all" on public.trip_state;
create policy "trip_state anon all" on public.trip_state for all using (true) with check (true);

-- 2) Photos & memes wall --------------------------------------------------------
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  path text,
  who text,
  caption text,
  created_at timestamptz default now()
);
alter table public.gallery enable row level security;
drop policy if exists "gallery anon all" on public.gallery;
create policy "gallery anon all" on public.gallery for all using (true) with check (true);

-- 2b) Per-destination live chat (instant, append-only) -------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  dest text not null,
  who text,
  body text not null,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
drop policy if exists "messages anon all" on public.messages;
create policy "messages anon all" on public.messages for all using (true) with check (true);

-- 2c) Itinerary — per-destination, day-by-day timed items ----------------------
create table if not exists public.itinerary (
  id uuid primary key default gen_random_uuid(),
  dest text not null,
  day int not null default 0,
  position int not null default 0,
  start_time text,
  end_time text,
  title text,
  place text,
  lat float8,
  lng float8,
  kind text default 'activity',
  notes text,
  idea_id text,
  created_at timestamptz default now()
);
alter table public.itinerary add column if not exists end_time text; -- calendar-grid upgrade
alter table public.itinerary enable row level security;
drop policy if exists "itinerary anon all" on public.itinerary;
create policy "itinerary anon all" on public.itinerary for all using (true) with check (true);

-- 2d) Joint chicken — one shared chick raised together ------------------------
create table if not exists public.chicken (
  id text primary key,
  data jsonb,
  last_client text,
  updated_at timestamptz default now()
);
insert into public.chicken (id) values ('shared') on conflict (id) do nothing;
alter table public.chicken enable row level security;
drop policy if exists "chicken anon all" on public.chicken;
create policy "chicken anon all" on public.chicken for all using (true) with check (true);

-- 3) Realtime (ignore "already member" if you re-run) ---------------------------
do $$ begin
  begin alter publication supabase_realtime add table public.trip_state; exception when others then null; end;
  begin alter publication supabase_realtime add table public.gallery;    exception when others then null; end;
  begin alter publication supabase_realtime add table public.messages;   exception when others then null; end;
  begin alter publication supabase_realtime add table public.itinerary;  exception when others then null; end;
  begin alter publication supabase_realtime add table public.chicken;    exception when others then null; end;
end $$;

-- 4) Storage bucket for uploaded images ----------------------------------------
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true)
on conflict (id) do nothing;

drop policy if exists "memes read"   on storage.objects;
drop policy if exists "memes insert" on storage.objects;
drop policy if exists "memes delete" on storage.objects;
create policy "memes read"   on storage.objects for select using (bucket_id = 'memes');
create policy "memes insert" on storage.objects for insert with check (bucket_id = 'memes');
create policy "memes delete" on storage.objects for delete using (bucket_id = 'memes');
