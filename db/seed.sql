-- 개발용 시드 데이터 (대전 대표 야간 명소, KTO 키 발급 후 실데이터로 대체 예정)

insert into night_spots (content_id, title, addr, category, geom) values
  ('mock-1', '한빛탑', '대전광역시 유성구 대덕대로 480', 'science', st_setsrid(st_makepoint(127.3897, 36.3757), 4326)),
  ('mock-2', '엑스포다리', '대전광역시 유성구 도룡동', 'city', st_setsrid(st_makepoint(127.3888, 36.3691), 4326)),
  ('mock-3', '대전시민천문대', '대전광역시 유성구 과학로 213-48', 'science', st_setsrid(st_makepoint(127.3762, 36.3908), 4326)),
  ('mock-4', '대청호 오백리길', '대전광역시 대덕구 대청호수로', 'nature', st_setsrid(st_makepoint(127.4842, 36.4767), 4326)),
  ('mock-5', '식장산 전망대', '대전광역시 동구 세천동', 'nature', st_setsrid(st_makepoint(127.4967, 36.3149), 4326)),
  ('mock-6', '대전0시축제 (중앙로 일원)', '대전광역시 중구 중앙로', 'festival', st_setsrid(st_makepoint(127.4255, 36.3282), 4326))
on conflict (content_id) do nothing;

-- 시드 명소는 야간 검증 완료 처리
update night_spots set night_verified = true where content_id like 'mock-%';

-- 큐레이션 스팟 수동 번역 (KTO 다국어 서비스에 없는 곳들)
insert into spot_translations (content_id, locale, title) values
  ('mock-1', 'en', 'Hanbit Tower'), ('mock-1', 'ja', 'ハンビット塔'), ('mock-1', 'zh', '韩光塔'),
  ('mock-2', 'en', 'Expo Bridge'), ('mock-2', 'ja', 'エキスポ橋'), ('mock-2', 'zh', '世博桥'),
  ('mock-3', 'en', 'Daejeon Observatory'), ('mock-3', 'ja', '大田市民天文台'), ('mock-3', 'zh', '大田市民天文台'),
  ('mock-4', 'en', 'Daecheongho Lake Trail'), ('mock-4', 'ja', '大清湖五百里道'), ('mock-4', 'zh', '大清湖五百里路'),
  ('mock-5', 'en', 'Sikjangsan Observatory'), ('mock-5', 'ja', '食蔵山展望台'), ('mock-5', 'zh', '食藏山观景台'),
  ('mock-6', 'en', 'Daejeon 0 O''Clock Festival'), ('mock-6', 'ja', '大田0時祭り'), ('mock-6', 'zh', '大田0时庆典')
on conflict (content_id, locale) do nothing;

-- 큐레이션 스팟 사진 (위키미디어 CC0·공공누리 1유형, public/spots/)
update night_spots set image_url = '/spots/hanbit-tower.jpg' where content_id = 'mock-1';
update night_spots set image_url = '/spots/expo-bridge.jpg' where content_id = 'mock-2';
update night_spots set image_url = '/spots/sikjangsan.jpg' where content_id = 'mock-5';
update night_spots set image_url = '/spots/jungangro-night.jpg' where content_id = 'mock-6'; -- 중앙로 야경, Wikimedia CC BY-SA 4.0 (Minseong Kim) — 푸터 출처표시

-- 커뮤니티 시드 글 (오픈 시 빈 게시판 방지 — 심사 전 팀이 실제 후기로 보강)
insert into community_posts (author, body) values
  ('Mina', '한빛탑 야경 진짜 예뻐요! 엑스포다리까지 걸어서 산책 추천합니다 🌙'),
  ('Kenji', '대전시민천문대는 몇 시까지 여나요? 별 보러 가고 싶어요'),
  ('Wei', '식장산 전망대에서 본 대전 야경 최고였어요. 차 없으면 가기 좀 힘들어요'),
  ('Sarah', 'Daecheongho lake trail was so peaceful at night. Bring a flashlight!')
on conflict do nothing;
