create table if not exists public.event_participants (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamp with time zone not null default now(),
  constraint event_participants_pkey primary key (id),
  constraint event_participants_unique unique (event_id, user_id)
);


create index if not exists idx_event_participants_event_id
  on public.event_participants (event_id);

create index if not exists idx_event_participants_user_id
  on public.event_participants (user_id);


alter table if exists public.event_participants enable row level security;


create policy if not exists "Service role full access"
  on public.event_participants
  for all
  to service_role
  using (true)
  with check (true);
