-- 1) chat_settings 增加自定义背景字段（可重复执行）
alter table if exists public.chat_settings
  add column if not exists background_url text;

-- 2) 创建/更新公开 bucket：chat-backgrounds（可重复执行）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-backgrounds',
  'chat-backgrounds',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/avif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3) Storage RLS 策略（可重复执行）
-- 3.1 公开读：任何人可读取该 bucket
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat_backgrounds_public_read'
  ) then
    create policy chat_backgrounds_public_read
      on storage.objects
      for select
      using (bucket_id = 'chat-backgrounds');
  end if;
end
$$;

-- 3.2 登录用户可上传到自己的命名路径：
-- 路径规范：{conversationId}/{userId}-{timestamp}.{ext}
-- 这里强制第2段（文件名）以前缀 "{auth.uid()}-" 开头
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat_backgrounds_auth_insert_own_prefix'
  ) then
    create policy chat_backgrounds_auth_insert_own_prefix
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'chat-backgrounds'
        and array_length(storage.foldername(name), 1) >= 2
        and position((auth.uid())::text || '-' in (storage.foldername(name))[2]) = 1
      );
  end if;
end
$$;

-- 3.3 上传者可更新自己前缀路径下的对象（覆盖/元数据更新）
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat_backgrounds_auth_update_own_prefix'
  ) then
    create policy chat_backgrounds_auth_update_own_prefix
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'chat-backgrounds'
        and array_length(storage.foldername(name), 1) >= 2
        and position((auth.uid())::text || '-' in (storage.foldername(name))[2]) = 1
      )
      with check (
        bucket_id = 'chat-backgrounds'
        and array_length(storage.foldername(name), 1) >= 2
        and position((auth.uid())::text || '-' in (storage.foldername(name))[2]) = 1
      );
  end if;
end
$$;

-- 3.4 上传者可删除自己前缀路径下的对象
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat_backgrounds_auth_delete_own_prefix'
  ) then
    create policy chat_backgrounds_auth_delete_own_prefix
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'chat-backgrounds'
        and array_length(storage.foldername(name), 1) >= 2
        and position((auth.uid())::text || '-' in (storage.foldername(name))[2]) = 1
      );
  end if;
end
$$;

