-- ============================================================
-- روضة أحباب الله — Supabase Migration
-- Run this SQL once in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Users table (auth accounts)
create table if not exists public.users (
  id            bigint generated always as identity primary key,
  full_name     text        not null,
  email         text        unique,
  phone         text        unique,
  role          text        not null check (role in ('admin', 'teacher', 'parent')),
  password_hash text        not null,
  linked_id     text,
  created_at    timestamptz not null default now()
);

-- 2. Files table (Supabase Storage metadata)
create table if not exists public.files (
  id          bigint generated always as identity primary key,
  user_id     bigint      not null references public.users(id) on delete cascade,
  role        text        not null check (role in ('admin', 'teacher', 'parent')),
  file_name   text        not null,
  file_path   text        not null unique,
  mime_type   text,
  size_bytes  bigint,
  public_url  text,
  created_at  timestamptz not null default now()
);

-- 3. Enable Row Level Security (recommended)
alter table public.users  enable row level security;
alter table public.files  enable row level security;

-- 4. Service-role bypass (backend uses service_role key — full access)
create policy "service_role full access on users"
  on public.users for all
  using (true) with check (true);

create policy "service_role full access on files"
  on public.files for all
  using (true) with check (true);

-- ============================================================
-- Storage bucket (run separately in Storage section):
-- Create a bucket named: school-files
-- Set it to Public if you want direct file URLs
-- ============================================================
