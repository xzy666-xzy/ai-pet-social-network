-- Event Group Chat Support (可重复执行)
-- 为 conversations 表增加群聊支持字段

-- 1) conversations 增加 type 字段：'direct' 或 'event_group'
alter table if exists public.conversations
  add column if not exists type text not null default 'direct';

-- 2) conversations 增加 event_id 字段（仅 event_group 类型使用）
alter table if exists public.conversations
  add column if not exists event_id uuid null;

-- 2.1) 群设置动态字段：群名称与群公告（可重复执行）
alter table if exists public.conversations
  add column if not exists group_name text,
  add column if not exists announcement text,
  add column if not exists announcement_updated_at timestamp with time zone,
  add column if not exists announcement_updated_by uuid references public.users(id) on delete set null;

-- 3) 创建 conversation_members 表（群聊成员）
create table if not exists public.conversation_members (
  id uuid not null default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  nickname text,
  joined_at timestamp with time zone not null default now(),
  constraint conversation_members_pkey primary key (id),
  constraint conversation_members_unique unique (conversation_id, user_id)
);

-- 3.1) 老表补充群内昵称字段（可重复执行）
alter table if exists public.conversation_members
  add column if not exists nickname text;

-- 3.2) 用户维度群设置：群备注（可重复执行）
alter table if exists public.chat_settings
  add column if not exists group_remark text;

-- 4) 为 conversation_members 创建索引
create index if not exists idx_conversation_members_conversation_id
  on public.conversation_members (conversation_id);

create index if not exists idx_conversation_members_user_id
  on public.conversation_members (user_id);

-- 5) 为 conversations.event_id 创建索引
create index if not exists idx_conversations_event_id
  on public.conversations (event_id)
  where event_id is not null;
