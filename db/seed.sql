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

-- 큐레이션 스팟 사진 (위키미디어 CC0·공공누리 1유형, public/spots/)
update night_spots set image_url = '/spots/hanbit-tower.jpg' where content_id = 'mock-1';
update night_spots set image_url = '/spots/expo-bridge.jpg' where content_id = 'mock-2';
update night_spots set image_url = '/spots/sikjangsan.jpg' where content_id = 'mock-5';
