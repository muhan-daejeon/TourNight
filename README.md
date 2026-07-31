# 투어나잇 (TourNight)

대전 특화 외국인 야간관광 통합 안내 서비스 — 『2026 관광데이터 활용 공모전』 웹·앱 개발 부문 (팀 무한대전)

대전의 '과학 + 자연 + 밤' 야간관광 콘텐츠를 외국인 관광객에게 다국어로 안내하는 웹 서비스입니다.

## 주요 기능 (계획)

1. 대전 야간관광 콘텐츠 제공
2. 야간 콘텐츠 인근 자연경관 추천
3. 목적지까지의 이동 경로 제공 (카카오맵)
4. 인근 숙소 정보 제공
5. 예절·문화·에티켓 정보 제공 (Gemini)
6. 사용자 커뮤니티
7. 다국어 지원 (한/영/중/일)

## 기술 스택

- **프레임워크**: Next.js (App Router, TypeScript, Tailwind CSS)
- **DB**: Supabase — PostgreSQL + PostGIS
- **외부 API**: 한국관광공사 TourAPI(OpenAPI), 카카오맵, Gemini
- **배포**: Vercel

## 시작하기

```bash
npm install
cp .env.example .env.local   # 키 값은 팀 내부 공유 채널에서 받기
npm run dev
```

http://localhost:3000 에서 확인.

## 환경 변수

`.env.example` 참고. **`.env.local`은 절대 커밋하지 않는다** (.gitignore에 포함됨).

| 변수 | 용도 |
|---|---|
| `KTO_API_KEY` | 한국관광공사 OpenAPI 서비스키 (공공데이터포털 발급) |
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | 카카오맵 JavaScript 앱 키 |
| `GEMINI_API_KEY` | Gemini API 키 |
| `DATABASE_URL` | Supabase PostgreSQL 연결 문자열 |

## 폴더 구조

```
src/
├── app/          # 페이지 + API 라우트
│   └── api/      # KTO OpenAPI 프록시, Gemini 등 서버 로직
├── components/
└── lib/          # DB 클라이언트, 외부 API 클라이언트
db/               # 스키마, 시드 스크립트
```

## 공모전 유의사항 (개발 시 필수 준수)

- 한국관광공사 OpenAPI는 **반드시 실시간 호출 형태로 활용** (파일데이터 불인정, 심사 시 호출 내역 확인)
- API 호출 시 `MobileApp` 파라미터에 서비스 고유명 `TourNight` 지정
- 서비스 화면·코드에 "한국관광공사", "KTO" 명칭/로고 사용 금지
- DB에 관광 데이터를 적재하는 경우 원천 데이터 수정 금지, 주기적 동기화 유지
- 1차 심사 서류 마감: **2026-09-21(월) 16:00**
