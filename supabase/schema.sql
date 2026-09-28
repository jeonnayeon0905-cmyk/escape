-- =====================================================================
-- 방탈출 기록 앱 — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전하도록(idempotent) 작성되어 있습니다.
-- =====================================================================

create extension if not exists pgcrypto;

-- 1. 테이블 ------------------------------------------------------------
create table if not exists public.escape_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  escape_date  date not null,
  cafe_name    text not null check (char_length(btrim(cafe_name)) between 1 and 100),
  theme_name   text not null check (char_length(btrim(theme_name)) between 1 and 100),
  result       text not null check (result in ('success', 'fail')),
  companions   text not null default '' check (char_length(companions) <= 200),
  difficulty   smallint not null check (difficulty between 1 and 5),
  review       text not null default '' check (char_length(review) <= 5000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.escape_records is '사용자별 방탈출 기록';

create index if not exists escape_records_user_date_idx
  on public.escape_records (user_id, escape_date desc, created_at desc);

-- 2. updated_at 자동 갱신 + 생성 정보 보호 --------------------------------
create or replace function public.escape_records_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  -- 소유자와 생성 시각은 수정으로 바꿀 수 없음
  new.user_id    := old.user_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists escape_records_before_update on public.escape_records;
create trigger escape_records_before_update
  before update on public.escape_records
  for each row execute function public.escape_records_before_update();

-- 3. RLS (Row Level Security) -----------------------------------------
--    로그인한 본인(auth.uid() = user_id)의 행만 조회/등록/수정/삭제 가능
alter table public.escape_records enable row level security;
alter table public.escape_records force row level security;

-- 비로그인(anon) 역할은 테이블에 아예 접근 불가
revoke all on public.escape_records from anon;
grant select, insert, update, delete on public.escape_records to authenticated;

drop policy if exists "records_select_own" on public.escape_records;
create policy "records_select_own" on public.escape_records
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "records_insert_own" on public.escape_records;
create policy "records_insert_own" on public.escape_records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "records_update_own" on public.escape_records;
create policy "records_update_own" on public.escape_records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "records_delete_own" on public.escape_records;
create policy "records_delete_own" on public.escape_records
  for delete to authenticated
  using ((select auth.uid()) = user_id);
