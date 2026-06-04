create extension if not exists pgcrypto;

create table if not exists public.profile_likes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create index if not exists idx_profile_likes_to_user_id
  on public.profile_likes (to_user_id);

