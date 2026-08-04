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

-- 서바이벌 한국어 표현 캐시 (언어당 1회 생성)
create table if not exists phrase_cache (
  locale text primary key,
  phrases jsonb not null,
  updated_at timestamptz not null default now()
);

-- 에티켓 가이드 사전생성 캐시 (심사/데모 때 Gemini 실시간 의존 제거)
create table if not exists etiquette_cache (
  topic_id text not null,
  locale text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  primary key (topic_id, locale)
);
