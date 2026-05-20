-- Event Participants Table (可重复执行)
-- 把活动参加者从内存 Map 迁移到 Supabase 表

-- 1) 创建 event_participants 表
create table if not exists public.event_participants (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamp with time zone not null default now(),
  constraint event_participants_pkey primary key (id),
  constraint event_participants_unique unique (event_id, user_id)
);

-- 2) 创建索引
create index if not exists idx_event_participants_event_id
  on public.event_participants (event_id);

create index if not exists idx_event_participants_user_id
  on public.event_participants (user_id);

-- 3) 启用 RLS（可选，服务端用 service_role 可跳过）
alter table if exists public.event_participants enable row level security;

-- 4) 允许 service_role 完全访问
create policy if not exists "Service role full access"
  on public.event_participants
  for all
  to service_role
  using (true)
  with check (true);
