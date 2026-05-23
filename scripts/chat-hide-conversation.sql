-- chat_settings 增加 hidden_at 字段（可重复执行）
-- 用于"仅当前用户删除聊天"功能：用户左滑删除聊天时，
-- 设置 hidden_at = now()，该会话对当前用户隐藏，
-- 对方用户不受影响，数据不硬删除。
alter table if exists public.chat_settings
  add column if not exists hidden_at timestamp with time zone;
