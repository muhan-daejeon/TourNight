-- KTO 원천을 DB에서 걷어내는 정리 (실시간 조회 전환에 맞춰)
--
-- 실행: psql "$DATABASE_URL" -f db/migrations/2026-08-24-realtime-kto.sql
-- 되돌릴 수 없다. 실행 전 백업을 권한다.

begin;

-- 1) 실시간으로 대체된 통계 적재 테이블
drop table if exists spot_congestion;
drop table if exists spot_related;
drop table if exists area_visitors;

-- 2) 이름 저장은 '공사에 다국어판이 없는 곳'만 남긴다
alter table spot_translations add column if not exists source text
  not null default 'manual';
alter table spot_translations drop column if exists lang_content_id;
alter table spot_translations drop column if exists overview;
alter table spot_translations drop column if exists addr;

-- KTO 공식 번역을 담아 두던 행은 지운다 (이제 요청 시점에 받는다).
-- 수동 큐레이션 명소(mock-)의 손번역만 남긴다.
delete from spot_translations where content_id not like 'mock-%';

-- 3) night_spots에는 우리 판단만 남긴다.
--    이름·주소·좌표·사진은 KTO 미등재 수동 명소(mock-) 전용이 된다.
alter table night_spots alter column title drop not null;
alter table night_spots alter column geom drop not null;

update night_spots
set title = null, addr = null, image_url = null, geom = null,
    use_time = null, cat1 = null, cat3 = null
where content_id not like 'mock-%';

commit;
