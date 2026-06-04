alter table if exists public.chat_settings
  add column if not exists hidden_at timestamp with time zone;
