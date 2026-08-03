# 백엔드 작업 목록 (Backend TODO)

투어나잇(TourNight) 백엔드 개선 과제 정리. 코드베이스 현재 상태(KTO 파이프라인 · PostGIS · Gemini · 수동 스크립트)를 기준으로 우선순위화했다.

> 공모전 요건 관련: 한국관광공사 OpenAPI는 **실시간 호출** 형태로 활용, `MobileApp=TourNight` 지정, KTO 명칭/로고 미노출, 원천 데이터 무수정·**주기적 동기화 유지**. 1차 심사 서류 마감 **2026-09-21(월) 16:00**.

---

## 🔴 우선순위 높음 — 공모전 요건 · 실제 리스크

### 1. 데이터 자동 동기화 스케줄링
- **현황**: `npm run db:sync` · `db:classify`가 수동 스크립트.
- **문제**: 공모전 요건이 "원천 데이터 **주기적 동기화 유지**" → 자동화 사실상 필수.
- **할 일**: Vercel Cron 또는 GitHub Actions로 주기 동기화. 부분 실패 로깅 · 재시도 · 실패 알림. 원본에서 삭제된 스팟 감지·비활성 처리.
- **관련 파일**: `db/sync-kto.mjs`, `db/classify-night.mjs`

### 2. KTO 실시간 호출 준수 확인
- **현황**: DB 적재 위주. 실시간 호출은 `fetchOverviewKo`(detailCommon2) 정도.
- **문제**: 심사 요건 "반드시 실시간 호출, 파일데이터 불인정".
- **할 일**: 화면에서 실시간 KTO 호출 경로를 명확히 두고 `MobileApp=TourNight` 호출 내역이 남게 설계(예: 상세 페이지 진입 시 실시간 detail 조회). 호출 통계 확인 가능하도록.
- **관련 파일**: `src/lib/kto.ts`

### 3. 스팟 조회/검색 API (route handler)
- **현황**: 검색이 클라이언트에서 전체 배열 필터링(`SpotExplorer`).
- **문제**: 데이터가 수백 건으로 늘면 한계.
- **할 일**: `GET /api/spots?q=&category=&bbox=` 서버 검색. PostGIS bbox 쿼리(지도 영역 기반) + `pg_trgm` 인덱스로 이름/주소 검색. 페이지네이션.
- **관련 파일**: `src/lib/spots.ts`, `src/components/SpotExplorer.tsx`

---

## 🟡 우선순위 중간 — 품질 · 확장

### 4. DB 마이그레이션 체계화
- **현황**: `schema.sql` + `alter ... add column if not exists` 수동 누적.
- **문제**: 팀 협업 시 스키마 드리프트 위험.
- **할 일**: 마이그레이션 도구(node-pg-migrate, drizzle 등) 또는 순번 SQL + 적용 이력 테이블 도입.
- **관련 파일**: `db/schema.sql`, `db/setup.mjs`

### 5. 인근 숙소(숙박) 데이터 연동
- **현황**: 계획 기능 ④ 미착수.
- **할 일**: KTO `contentTypeId=32`(숙박)로 스팟 인근 숙소 조회. 기존 `getNearbySpots`의 PostGIS 거리 쿼리 패턴 재사용.
- **관련 파일**: `src/lib/spots.ts`, `src/lib/kto.ts`

### 6. Gemini 라우트 비용/남용 방어
- **현황**: `/api/etiquette`가 캐시 미스 시 실시간 생성.
- **문제**: 무한 호출 시 비용 폭증 가능.
- **할 일**: rate limiting(IP/세션), `pregen` 스크립트로 전 topic×locale 사전생성 보장. (프롬프트 주입 방어는 화이트리스트로 이미 적용 — 유지)
- **관련 파일**: `src/app/api/etiquette/route.ts`, `src/lib/gemini.ts`, `db/pregen-etiquette.mjs`

### 7. 입력 검증 & 환경변수 검증
- **할 일**: API 파라미터 검증을 zod 등으로 일원화. `DATABASE_URL!` 논-널 단언 대신 부팅 시 필수 env 체크(누락 시 명확한 에러).
- **관련 파일**: `src/lib/db.ts`, 각 API route

---

## 🟢 우선순위 낮음 — 기반 다지기

### 8. 테스트 + CI
- **현황**: 테스트 0.
- **할 일**: `lib`(spots · kto · gemini) 유닛 + API route 통합 테스트. GitHub Actions로 lint/typecheck/test 게이트.

### 9. 관측성(Observability)
- **현황**: `console.warn` 폴백 로그만.
- **할 일**: 구조화 로깅 + 에러 모니터링(Sentry 등).

### 10. 캐싱 계층 정리
- **할 일**: KTO 응답 캐싱 일관화(현재 `next: { revalidate }` 산발적), ISR `revalidate` 튜닝, `etiquette_cache` TTL 정책 수립.

---

## 추천 착수 순서

**1 (자동 동기화) → 3 (스팟 검색 API) → 4 (마이그레이션)**

"데이터가 계속 최신으로 유지되고 / 확장 가능하게 조회되고 / 스키마가 안전하게 관리되는" 백엔드 뼈대라 투자 대비 효과가 크다.
