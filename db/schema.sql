-- 투어나잇 DB 스키마
-- 실행: npm run db:setup

create extension if not exists postgis;

-- 야간관광 스팟 (KTO 데이터 적재 대상, 키 발급 전에는 목 데이터 시드)
create table if not exists night_spots (
  id bigint generated always as identity primary key,
  content_id text unique not null,       -- KTO contentId (목 데이터는 mock- 접두사)
  title text not null,
  addr text,
  category text not null check (category in ('science', 'nature', 'festival', 'city')),
  image_url text,
  geom geometry(Point, 4326) not null,   -- 경도/위도 (WGS84)
  created_at timestamptz not null default now()
);

create index if not exists night_spots_geom_idx on night_spots using gist (geom);

-- 야간 운영 검증 플래그 (TourAPI usetime이 비정형이라 자동 판별 불가 → LLM 1차 분류 + 수동 검수)
alter table night_spots add column if not exists night_verified boolean not null default false;

-- KTO 원본 분류 정보 (야간 분류·카테고리 매핑 근거)
alter table night_spots add column if not exists content_type_id text;
alter table night_spots add column if not exists cat1 text;
alter table night_spots add column if not exists cat3 text;

-- 야간 분류 파이프라인: 운영시간 원문, Gemini 1차 후보 판정·사유
alter table night_spots add column if not exists use_time text;
alter table night_spots add column if not exists night_candidate boolean;
alter table night_spots add column if not exists night_reason text;

-- KTO 다국어 관광정보 서비스(영/일/중 GW) 공식 번역 — 좌표 매칭으로 수집 (db/sync-i18n.mjs)
create table if not exists spot_translations (
  content_id text not null,        -- 우리 night_spots의 content_id (국문 기준)
  locale text not null,            -- en / ja / zh / ko
  lang_content_id text,            -- 해당 언어 서비스의 contentid
  title text,                      -- 공식 번역 명칭
  overview text,                   -- 공식 번역 소개문
  updated_at timestamptz not null default now(),
  primary key (content_id, locale)
);

-- 스팟별 현지화 가이드 캐시 (KTO 개요 → Gemini 번역·요약 + 야간 팁, 스팟·언어당 1회 생성)
create table if not exists spot_guide (
  content_id text not null,
  locale text not null,
  intro text not null,
  tips jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (content_id, locale)
);

-- 관광지 집중률 예측 (KT 통신데이터 기반, TatsCnctrRateService — db/sync-congestion.mjs)
create table if not exists spot_congestion (
  content_id text not null,
  base_ymd date not null,
  rate numeric not null,  -- 0~100 상대 집중률 (가장 붐비는 시기 = 100)
  primary key (content_id, base_ymd)
);

-- 커뮤니티 한줄 후기/질문 (로그인 없이 이름만 입력, 스팟 연동은 content_id로 선택)
create table if not exists community_posts (
  id bigint generated always as identity primary key,
  content_id text,                      -- 연관 스팟(night_spots.content_id) — null이면 자유글
  author text not null,                 -- 작성자 표시 이름 (로그인 대체)
  body text not null,                   -- 본문 (한줄 후기/질문)
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_idx on community_posts (created_at desc);

-- 커뮤니티 댓글 (글에 달리는 답글, 글과 함께 삭제)
create table if not exists community_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references community_posts(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists community_comments_post_idx on community_comments (post_id, created_at);

-- 회원 (이메일 로그인 + 표시용 닉네임 + 국가). 비번은 scrypt 해시(salt:hash)로만 저장.
-- oauth_* 컬럼은 이후 소셜 로그인 확장 대비 예약 (지금은 미사용)
create table if not exists users (
  id bigint generated always as identity primary key,
  email text unique not null,
  password_hash text,               -- 소셜 전용 계정은 null 가능
  nickname text not null,
  country text,                     -- ISO 3166-1 alpha-2 (예: KR, JP)
  oauth_provider text,              -- 예: 'google' (예약)
  oauth_id text,                    -- 제공자 측 사용자 id (예약)
  created_at timestamptz not null default now()
);

-- 대전 구별 일별 방문자 수 (KTO 빅데이터 지역별 방문자수 — db/sync-visitors.mjs, 집계 지연 있어 최근 가용 7일 저장)
create table if not exists area_visitors (
  signgu_cd text not null,   -- 30110 동구 / 30140 중구 / 30170 서구 / 30200 유성구 / 30230 대덕구
  base_ymd date not null,
  tou_div text not null,     -- 1 현지인 / 2 외지인 / 3 외국인
  num numeric not null,
  primary key (signgu_cd, base_ymd, tou_div)
);

-- 서바이벌 한국어 표현 캐시 (언어당 1회 생성) — v2(phrase_book)로 대체, 호환용 유지
create table if not exists phrase_cache (
  locale text primary key,
  phrases jsonb not null,
  updated_at timestamptz not null default now()
);

-- 서바이벌 한국어 v2: 상황별 표현집 (언어·카테고리당 1회 생성)
create table if not exists phrase_book (
  locale text not null,
  category text not null,   -- food / bar / taxi / help / store
  phrases jsonb not null,   -- [{korean, roman, meaning}]
  updated_at timestamptz not null default now(),
  primary key (locale, category)
);

-- 서바이벌 한국어 검색·번역 캐시 (같은 질문 재요청 시 Gemini 호출 절약)
create table if not exists phrase_search_cache (
  locale text not null,
  query_norm text not null,
  result jsonb not null,    -- {main:{korean,roman,meaning}, related:[...]}
  updated_at timestamptz not null default now(),
  primary key (locale, query_norm)
);

-- 에티켓 가이드 사전생성 캐시 (심사/데모 때 Gemini 실시간 의존 제거)
create table if not exists etiquette_cache (
  topic_id text not null,
  locale text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  primary key (topic_id, locale)
);

-- KTO 연관 관광지(차량 이동 기반) 중 우리 야간명소끼리의 연결 — 코스 '함께 방문' 배지용.
-- db/sync-related.mjs가 TarRlteTarService1에서 수집해 좌표 있는 우리 스팟쌍만 저장한다.
create table if not exists spot_related (
  content_id text not null,          -- 기준 스팟(night_spots.content_id)
  related_content_id text not null,  -- 연관 스팟(우리 스팟)
  rank int,                          -- KTO 연관 순위
  base_ym text,                      -- 수집 기준월 (YYYYMM)
  primary key (content_id, related_content_id)
);

-- AI 코스 짜기 캐시 (지도에서 스팟 선택 → Gemini가 그 스팟을 거치는 코스 생성).
-- 스팟·언어당 1건만 두고 재요청 시 재사용한다 (심사/데모 때 실시간 Gemini 의존 축소).
create table if not exists ai_course_cache (
  content_id text not null,
  locale text not null,
  course jsonb not null,   -- 생성된 코스 전체 (AiCourse: title/summary/tip/notes/stops/legs)
  updated_at timestamptz not null default now(),
  primary key (content_id, locale)
);

-- 홈 카테고리 필터를 코스 설계에 반영하면서 캐시 키에 선호 카테고리가 추가됐다
-- (필터 없음 = ''). 기존 (content_id, locale) PK를 재구성한다.
alter table ai_course_cache add column if not exists pref_category text not null default '';
alter table ai_course_cache drop constraint if exists ai_course_cache_pkey;
alter table ai_course_cache add primary key (content_id, locale, pref_category);

-- 스팟별 인근 버스 정류장·막차 정보 (TAGO 버스정류소정보/버스노선정보 — db/sync-transit.mjs).
-- 야간 명소는 막차가 22시대라 "보다가 막차 놓침"이 실제 위험이라 미리 적재해 둔다.
-- 정류장이 없는 스팟도 node_id = null로 행을 남겨 '정류장 없음(택시 권장)'을 구분한다.
create table if not exists spot_transit (
  content_id text primary key,
  node_id text,             -- TAGO 정류소 ID (대전 citycode 25만)
  node_name text,
  distance_m int,           -- 스팟 ↔ 정류장 직선거리
  routes jsonb not null default '[]',  -- [{routeNo, firstTime, lastTime, intervalMin, endNode}]
  last_bus text,            -- 경유노선 중 가장 늦은 막차 (HHMM)
  updated_at timestamptz not null default now()
);

-- 스팟 간 실제 이동 경로 (TMap 보행자·대중교통 — db/sync-routes.mjs).
-- TMap 앱키는 허용 IP 제한이 걸리고 Vercel 출구 IP는 고정이 아니라, 런타임 호출이 불가능하다.
-- 그래서 등록된 개발 PC에서 배치로 미리 계산해 두고 앱은 이 표만 읽는다.
--
-- status는 '경로 없음'과 '아직 계산 안 함'을 구분하기 위해 둔다. 재실행 시 ok가 아닌
-- 행만 다시 시도하면 되므로, 무료 호출 한도에 걸려도 여러 번 나눠 돌릴 수 있다.
create table if not exists spot_route (
  from_content_id text not null,
  to_content_id text not null,
  mode text not null check (mode in ('walk', 'transit', 'taxi')),
  status text not null check (status in ('ok', 'too_close', 'no_route')),
  duration_sec int,      -- 총 소요 시간
  distance_m int,        -- 총 이동 거리
  transfer_count int,    -- 대중교통 환승 횟수 (도보는 null)
  fare int,              -- 대중교통 요금 (원)
  legs jsonb not null default '[]',  -- [{mode, route, durationSec, distanceM, path:[[lng,lat],...]}]
  updated_at timestamptz not null default now(),
  primary key (from_content_id, to_content_id, mode)
);

-- 택시(TMap 자동차 경로)를 추가하면서 mode 목록을 넓힌다. 이미 만들어진 테이블은
-- create table로 갱신되지 않으므로 제약을 다시 건다.
alter table spot_route drop constraint if exists spot_route_mode_check;
alter table spot_route add constraint spot_route_mode_check
  check (mode in ('walk', 'transit', 'taxi'));

-- 커뮤니티 글/댓글 작성자 계정 연결 (본인 글 삭제 판별용) — users 정의 후에 추가.
-- 계정 삭제 시 글은 남기되 소유만 해제(set null). 기존 글은 null(삭제 버튼 없음).
alter table community_posts add column if not exists user_id bigint references users(id) on delete set null;

-- 커뮤니티 첨부 사진 (Supabase Storage의 community 버킷).
-- URL이 아니라 저장 경로를 둔다 — 글 삭제 시 그 경로로 스토리지 객체도 지워야 하고,
-- 공개 URL은 조회할 때 SUPABASE_URL로 조립하면 되기 때문.
-- 댓글 첨부도 글과 동일한 구조 (community 버킷, 경로 저장)
alter table community_comments add column if not exists media_path text;
alter table community_comments add column if not exists media_type text
  check (media_type is null or media_type in ('image', 'video'));

alter table community_posts add column if not exists media_path text;
alter table community_posts add column if not exists media_type text
  check (media_type is null or media_type in ('image', 'video'));
alter table community_comments add column if not exists user_id bigint references users(id) on delete set null;
