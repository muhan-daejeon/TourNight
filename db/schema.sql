-- 투어나잇 DB 스키마
-- 실행: npm run db:setup

create extension if not exists postgis;

-- 야간관광 스팟 (KTO 데이터 적재 대상, 키 발급 전에는 목 데이터 시드)
-- 야간 명소 검수 결과.
--
-- KTO에 있는 곳은 이름·주소·좌표·사진을 저장하지 않는다 — 서비스가 요청 시점에
-- API로 받는다(src/lib/kto-live.ts). 여기 남는 것은 우리 판단(카테고리·야간 검수)이다.
-- title/addr/geom/image_url은 KTO 미등재 수동 큐레이션 명소(mock-)에만 채운다.
create table if not exists night_spots (
  id bigint generated always as identity primary key,
  content_id text unique not null,       -- KTO contentId (수동 등록은 mock- 접두사)
  title text,                            -- mock- 전용
  addr text,                             -- mock- 전용
  category text not null check (category in ('science', 'nature', 'festival', 'city')),
  image_url text,                        -- mock- 전용
  geom geometry(Point, 4326),            -- mock- 전용 (경도/위도, WGS84)
  created_at timestamptz not null default now()
);

-- 기존 배포분 정리 — KTO 원천을 담던 시절의 not null 제약을 푼다
alter table night_spots alter column title drop not null;
alter table night_spots alter column geom drop not null;

-- 공사에 다국어판이 없는 명소의 외국어 이름.
--
-- KTO에 영·일·중판이 있는 곳은 언어별 서비스가 공식 표기를 주므로 저장하지 않는다.
-- 여기 남는 것은 두 가지뿐이다 — 수동 큐레이션 명소(mock-)의 손번역과,
-- 공사 다국어 서비스에 등재가 없어 우리가 AI로 옮긴 이름(source='ai').
create table if not exists spot_translations (
  content_id text not null,
  locale text not null,            -- en / ja / zh / ko
  title text,
  source text not null default 'manual' check (source in ('manual', 'ai')),
  updated_at timestamptz not null default now(),
  primary key (content_id, locale)
);

alter table spot_translations add column if not exists source text
  not null default 'manual';

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



-- 스팟별 현지화 가이드 캐시 (KTO 개요 → Gemini 번역·요약 + 야간 팁, 스팟·언어당 1회 생성)
create table if not exists spot_guide (
  content_id text not null,
  locale text not null,
  intro text not null,
  tips jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (content_id, locale)
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

-- 메일 인증 시각. boolean 대신 시각으로 둬서 "언제 인증했는지"가 남는다.
-- null = 미인증 → 커뮤니티 글·댓글 작성만 막힌다 (읽기·명소·코스는 그대로).
alter table users add column if not exists email_verified_at timestamptz;

-- 활성 세션 세대. 로그인할 때마다 1씩 올리고 그 값을 세션 토큰에 넣는다.
-- 토큰의 값이 여기보다 낮으면 '이미 다른 기기에서 로그인된 계정'이므로 무효다.
-- 계정 하나를 여러 사람이 돌려쓰는 걸 막는 용도 (IP는 보지 않는다 — 관광객은
-- 이동하면서 IP가 계속 바뀌어 정상 이용자만 걸린다).
alter table users add column if not exists session_version int not null default 0;

-- 가입 후 둘러보기(온보딩)를 본 시각. boolean이 아니라 시각으로 두면 '언제 봤는지'가
-- 남아, 기능이 크게 늘었을 때 다시 권할지 판단할 근거가 된다.
-- 건너뛰기도 여기에 기록한다 — 프로필에서 언제든 다시 볼 수 있으므로 둘을 구분할
-- 실익이 없다.
alter table users add column if not exists tour_completed_at timestamptz;

-- 메일 인증 토큰.
--
-- 원문 토큰은 저장하지 않는다 — 그대로 넣어두면 DB가 새는 순간 아무나 남의 계정을
-- 인증할 수 있다. 메일에는 원문을 보내고 여기에는 sha256만 남긴다.
create table if not exists email_verifications (
  token_hash text primary key,      -- sha256(원문 토큰), hex
  user_id bigint not null references users(id) on delete cascade,
  email text not null,              -- 발송 시점 주소 (주소가 바뀌면 옛 토큰은 무효)
  expires_at timestamptz not null,
  consumed_at timestamptz,          -- 한 번 쓴 토큰은 재사용 불가
  created_at timestamptz not null default now()
);

-- 사용자별 조회(재발송 제한·기존 토큰 정리)가 주 접근 경로다
create index if not exists email_verifications_user_idx
  on email_verifications (user_id, created_at desc);

-- 커뮤니티 일일 작성 한도 (ai_course_usage와 같은 방식).
--
-- 글·댓글 표를 직접 세지 않고 따로 기록하는 이유는, 쓴 글을 지우면 카운트가
-- 되돌아가 '쓰고 지우기'를 반복해 한도를 무한히 우회할 수 있기 때문이다.
create table if not exists community_usage (
  user_id bigint not null references users(id) on delete cascade,
  kind text not null check (kind in ('post', 'comment')),
  used_on date not null,
  count int not null default 0,
  primary key (user_id, kind, used_on)
);

-- 이용자 신고.
--
-- 관리자가 모든 글을 볼 수는 없으므로 이용자가 올려주는 통로를 둔다.
-- 글·댓글에 FK를 걸지 않는 이유는 대상이 둘로 갈리기 때문이고, 원본이 지워져도
-- 신고 이력은 남겨 같은 작성자의 반복 여부를 볼 수 있게 한다.
create table if not exists community_reports (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id bigint not null,
  reporter_id bigint not null references users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  -- 같은 사람이 같은 대상을 여러 번 눌러 건수를 부풀리지 못하게 한다
  unique (target_type, target_id, reporter_id)
);

create index if not exists community_reports_target_idx
  on community_reports (target_type, target_id);


-- 도장투어 with 꿈돌이: 사용자가 고른 관광지 4곳 + 각자 찍은 인증사진.
-- 계정당 1회만 고른다(재선택 없음)고 가정해 user_id를 PK로 둔다. stops는
-- 항상 4칸짜리 배열 [{name, lat, lng, photoPath}] — 아직 안 찍은 칸은
-- photoPath가 null. 순서(0~3)가 4컷 콜라주 칸 순서와 그대로 맞는다.
create table if not exists stamp_tours (
  user_id bigint primary key references users(id) on delete cascade,
  stops jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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


-- 커뮤니티 글·댓글 번역 캐시 (같은 글을 여러 사람이 눌러도 Gemini는 한 번만 부른다)
create table if not exists community_translation_cache (
  target_type text not null,   -- 'post' | 'comment'
  target_id bigint not null,
  locale text not null,        -- 번역 대상 언어(화면 로케일)
  body text not null,
  updated_at timestamptz not null default now(),
  primary key (target_type, target_id, locale)
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

-- AI 코스 생성 사용량 (계정·날짜별). 캐시 적중은 세지 않고 실제 생성만 기록한다.
-- 코스 한 번에 Gemini + TMap + ODsay + KTO를 모두 호출하므로, 계정 하나가
-- 조합을 바꿔가며 돌리면 외부 API 무료 한도가 하루치씩 소진된다.
create table if not exists ai_course_usage (
  user_id bigint not null references users(id) on delete cascade,
  used_on date not null,
  count int not null default 0,
  primary key (user_id, used_on)
);

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

-- 관리자/일반 역할 구분 — 관리자는 코스 생성 한도 없이 쓰고 /admin에 들어갈 수 있다.
-- 지정: update users set role='admin' where email='...';
alter table users add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- 사용자 활동 로그 — 관리자 페이지에서 "누가 무슨 기능을 어떻게 썼는지"를 본다.
-- (ai_course / etiquette / phrases / phrase_search / community_post / community_comment / spot_view)
create table if not exists activity_log (
  id bigserial primary key,
  user_id bigint references users(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists activity_log_created_idx on activity_log (created_at desc);
create index if not exists activity_log_user_idx on activity_log (user_id, created_at desc);

-- 외부 API 응답의 마지막 성공분. 실시간 호출이 실패했을 때만 읽는다 (src/lib/api-cache.ts).
-- 원천을 대체하는 적재가 아니라 응답 캐시다 — 한도가 막힌 날에도 화면이 비지 않게.
create table if not exists api_cache (
  cache_key text primary key,      -- 서비스/오퍼레이션?파라미터 (인증키 제외)
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

-- 커뮤니티 댓글 번역 캐시 — 보는 사람의 언어로 댓글을 자동 번역해 보여준다
-- (Gemini). 같은 댓글·같은 언어는 한 번만 번역하고 여기 저장분을 재사용한다.
-- 댓글이 지워지면 번역도 함께 지워진다 (cascade).
create table if not exists community_comment_translations (
  comment_id bigint not null references community_comments(id) on delete cascade,
  locale text not null,
  body text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, locale)
);
