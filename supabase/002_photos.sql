-- =====================================================================
-- 방탈출 기록 앱 — 사진 기능 추가 (schema.sql 을 먼저 실행한 뒤 실행)
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다. 기존 기록은 변경되지 않습니다.
-- =====================================================================

-- 1. 기록에 사진 경로 컬럼 추가 (사진은 Storage 에, DB 에는 경로만 저장)
alter table public.escape_records
  add column if not exists photo_path text;

-- 사진 경로는 반드시 '본인 user_id/파일명' 형태여야 함
alter table public.escape_records
  drop constraint if exists escape_records_photo_path_owner;
alter table public.escape_records
  add constraint escape_records_photo_path_owner
  check (photo_path is null or (photo_path like (user_id::text || '/%') and char_length(photo_path) <= 300));

-- 2. 사진 저장소 (비공개 버킷, 5MB 이하 JPEG/WebP/PNG 만)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('escape-photos', 'escape-photos', false, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Storage 접근 정책: 본인 폴더(첫 번째 경로 = 내 user_id)만 조회/업로드/수정/삭제
drop policy if exists "escape_photos_select_own" on storage.objects;
create policy "escape_photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'escape-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "escape_photos_insert_own" on storage.objects;
create policy "escape_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'escape-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "escape_photos_update_own" on storage.objects;
create policy "escape_photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'escape-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'escape-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "escape_photos_delete_own" on storage.objects;
create policy "escape_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'escape-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
