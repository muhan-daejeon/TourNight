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
