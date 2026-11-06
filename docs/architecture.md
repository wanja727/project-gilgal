# 길갈 아키텍처

> 기준 문서: `docs/requirements.md` (상단 "확정 변경 사항" 우선).
> 개정 이력: v1 2026-10-19 Selah DB 공유안 → v2 2026-10-19 독립 Supabase 프로젝트안(ADR-011)
> → **v3 2026-10-19 Selah식 온보딩 재사용, 단일 Supabase 프로젝트, 서비스 내 본문 제공, Vercel 기본 도메인**(ADR-015~017).
> 결정 사항은 하단 [설계 결정 기록(ADR)](#10-설계-결정-기록-adr)에 누적한다.

---

## 1. Selah 분석 결과 (참고 자료)

분석 대상: `C:\side-project\project-selah` (커밋 `2aba921`). 읽기 전용으로만 분석했다.
길갈은 이 코드를 import 하거나 이 DB에 접속하지 않는다. 패턴만 참고해 새로 작성한다.

### 1.1 기술 스택

| 항목 | Selah |
|---|---|
| 프레임워크 | Next.js 16.1.6 (App Router, RSC, Server Actions), React 19.2.3, TypeScript strict |
| 스타일 | Tailwind CSS v4 (`@theme` 토큰, `globals.css`) |
| 인증 | Auth.js `next-auth@5.0.0-beta.30` + **카카오 OAuth**, `session.strategy = "database"` |
| DB 접근 | Drizzle ORM 0.45 + `pg`(node-postgres) + Vercel `attachDatabasePool`, 질의 15초 제한(ADR-032 — 이전 postgres.js). 스크립트는 postgres.js `prepare: false` |
| DB | Supabase PostgreSQL (서울 리전 풀러) |
| Supabase SDK | 의존성에만 있고 코드에서 미사용 |
| 패키지 매니저 | pnpm |
| 배포 | Vercel. `vercel.json` 없음, `app/layout.tsx` 에서 `preferredRegion = "icn1"` |

### 1.2 인증 및 세션 구조

- `lib/auth.ts`: `NextAuth({ adapter: DrizzleAdapter(db, {...}), providers: [Kakao], session: { strategy: "database" }, pages: { signIn: "/login" } })`.
- Supabase Auth 미사용. 사용자/세션은 Auth.js 표준 테이블(`user`, `account`, `session`, `verificationToken`)에 저장.
- `callbacks.session` 에서 user 행의 커스텀 컬럼(`realName`, `cellName`, `onboardingCompleted`, `isAdmin`)을 세션에 실음.
- `events.signIn`: 카카오 고유 ID(`account.providerAccountId`)가 `cell_roster.kakaoId` 와 일치하면 실명·셀을 채우고 온보딩 완료.
- 라우트 가드: 미들웨어 없이 각 페이지에서 `auth()` → `/login`, `/onboarding` 리다이렉트. 세션 의존 페이지는 `dynamic = "force-dynamic"`.
- 서버 액션은 매번 `auth()` 로 userId 획득(클라이언트 입력 userId 미사용).
- 빈무덤(empty-tomb)·셀라는 **같은 카카오 앱(KAKAO_CLIENT_ID)** 을 공유하며, Selah는 이 점을 이용해 빈무덤 DB의 카카오 ID를 import 한 선례가 있다(`lib/db/import-from-empty-tomb.ts`). 길갈의 회원 연결 방식(5절)도 같은 원리다.

### 1.3 사용자와 소속 셀 데이터

- **셀 전용 테이블 없음.** `user.cellName`(text, 예: `"정윤경셀"`)에 이름 문자열 저장. 미배정은 `"미배정"`.
- `cell_roster`(id, kakaoId UNIQUE nullable, name, cellName, UNIQUE(name, cellName)): 교회 명단. 셀 배정 우선순위
  1. 카카오 ID 매칭 → 2. 실명 매칭(미점유 동명 행이 정확히 1개일 때만, 매칭 시 kakaoId 백필) → 3. 수동 선택(화이트리스트 검증).
- 셀 원본 목록: `lib/db/cellData.ts`(26개 셀, 7월 청년캠프1 기준).
- 관리자 지표는 `user INNER JOIN account` 로 고아 user 행을 제외하고 집계.

### 1.4 DB 스키마 및 마이그레이션

- 단일 `lib/db/schema.ts`: `user`, `account`, `session`, `verificationToken`, `cell_roster`, `bible_verse`(미사용), `attendance`, `memorization_progress`, `daily_visit`.
- 마이그레이션 파일 없음 — `drizzle-kit push` 로 운영. `DIRECT_URL`(세션 모드 :5432)로 drizzle-kit, 런타임은 `DATABASE_URL`(트랜잭션 풀러 :6543).

### 1.5 재사용할 코드 패턴

| Selah 위치 | 내용 | 길갈 |
|---|---|---|
| `lib/auth.ts`, `types/next-auth.d.ts` | Auth.js + Kakao + DB 세션 | 같은 패턴으로 새로 작성 |
| `app/onboarding/*` | 3단계 셀 배정 | 규칙 재사용, 길갈 테이블 구조로 재작성 |
| `lib/db/index.ts` | postgres.js + drizzle (`prepare:false`) | [변경 2026-11-01] pg + attachDatabasePool(ADR-032) |
| `lib/db/import-from-empty-tomb.ts` | 타 서비스 카카오 ID import | 이관 스크립트의 선례(단, 길갈은 Selah DB에 직접 접속하지 않음 — ADR-013) |
| `lib/utils/date.ts` | KST 날짜 | `lib/time.ts` 로 확장 |
| `lib/browser/env.ts`, `InAppBrowserNotice` | 인앱 브라우저 감지 | 안내 배너만(ADR-010) |
| `app/layout.tsx` | `max-w-md` 모바일 컨테이너, Noto Serif/Sans KR, `icn1` | 구조 재사용, 디자인 토큰은 새로 |
| `app/admin/layout.tsx` | 관리자 가드 | 패턴 재사용 |
| `app/read/actions.ts` `resolveRecordDate` | 미래 날짜 차단 서버 검증 | 공개 정책(7절)으로 일반화 |

공통 Header/Navigation 컴포넌트는 없고 페이지마다 인라인 헤더. 모바일은 `max-w-md` 단일 컬럼 + `min-h-dvh` + `active:scale-*` 터치 피드백.

### 1.6 성경 본문 처리

- Selah는 개역개정 본문을 TS 상수로 저장소에 포함("비상업적 테스트 용도" 주석). **길갈은 따르지 않는다**(8.5절, ADR-008).

### 1.7 확인하지 않은 것

- Selah 운영 DB 상태(RLS·롤·실제 컬럼) — 접속하지 않음. 길갈은 이제 Selah DB에 의존하지 않으므로 길갈 설계에는 영향 없음.
- Selah `.env.local` 값 — 키 이름만 확인, 값은 읽지 않음.
- 카카오 개발자 콘솔·Vercel 설정 — 저장소 밖이라 확인 불가.

> ⚠️ Selah 측 참고(수정하지 않음): Supabase는 `public` 스키마를 Data API로 노출한다. Selah `public` 테이블에 RLS가 꺼져 있다면 공개 anon key 로 `session`/`account` 조회가 가능할 수 있으니 대시보드에서 확인을 권장한다.

---

## 2. 아키텍처 개요 (v2)

**길갈은 독립된 Supabase 프로젝트를 사용한다. Selah와 공유하는 것은 "카카오 OAuth 앱" 하나뿐이다.** (ADR-011)

```
            ┌───────────── 카카오 OAuth 앱 (공유, 회원번호 동일) ─────────────┐
            │                                                                │
   [Selah: Vercel] ── Selah Supabase (변경 없음)        [길갈: Vercel icn1] ── 길갈 Supabase (신규)
                          │                                      ▲
                          │ (오픈 전 1회, 운영자가 SQL Editor에서 │
                          │  읽기 전용 SELECT → CSV)              │ import 스크립트 (CSV → roster_entry)
                          └──────────────── CSV ─────────────────┘
```

- 런타임에 길갈은 Selah DB에 **절대 접속하지 않는다**. Selah 접속 정보도 길갈 환경변수에 두지 않는다.
- 기존 회원 연결 키 = **카카오 회원번호**(`account.providerAccountId`). DB가 다르므로 길갈의 내부 `user.id` 는 Selah와 다른 새 값이다. Selah `user.id` 는 이관하지도 저장하지도 않는다.

### 2.1 요청 흐름

```
[모바일 브라우저] ──HTTPS──> [Vercel: Next.js (icn1)]
                                ├─ RSC 페이지: auth() → getViewer() → DB 조회 → HTML
                                ├─ Server Actions: 읽기 완료 / 온보딩 / 댓글 / 공감 (userId=세션)
                                ├─ Route Handler: /api/auth/*, /api/avatar/[key]
                                └─ lib/db (drizzle + pg, attachDatabasePool)
                                        │ DATABASE_URL (트랜잭션 풀러 :6543)
                                        ▼
                               [길갈 Supabase Postgres (서울)]
```

- 브라우저는 DB/Supabase에 직접 접근하지 않는다. 브라우저에 노출되는 Supabase 키 없음.
- 정적 콘텐츠(여정 설정, 브랜딩, 지도 데이터)는 빌드 타임 상수.

### 2.2 디렉터리 구조(예정)

```
app/
  layout.tsx                 모바일 컨테이너, 폰트, 테마 토큰, preferredRegion
  page.tsx                   홈 = 오늘의 여정 + 미니 지도 (기간 상태별 분기)
  login/  onboarding/
  day/[day]/page.tsx         DAY n 본문 + 읽기 완료 (+ 댓글)
  journey/page.tsx           여정 지도 + 나의 24일 + 아직 걷지 않은 길
  community/page.tsx         공동체·셀 진행도 (Phase 2)
  finale/page.tsx            완주 회고 (Phase 3, 11/27 배포)
  admin/                     댓글 숨김/복구 (셀 편성은 DB 직접 수정)
  api/auth/[...nextauth]/route.ts
  api/avatar/[key]/route.ts DiceBear SVG (key = seed 또는 seed~부품)
lib/
  brand.ts                   SERVICE_NAME, SERVICE_SUBTITLE, 브랜딩 문구
  time.ts                    nowKst(), todayKst() (+ 개발용 오버라이드)
  journey/
    campaign.ts              캠페인 메타(기간, catch-up, slug)
    days.ts                  24일 데이터(JourneyDay[])
    locations.ts             지도 지점/경로 (Phase 2: 지파 영역·도피성)
    schedule.ts              날짜 ↔ DAY, 공개 정책 (순수 함수)
    mapState.ts              완료 집합 → 지도 상태 (순수 함수)
  bible/
    types.ts                 BibleTextProvider, ChapterText
    providers/mock.ts        개발·테스트 (허락 전)
    providers/static.ts      허락 후: 정적 JSON
    providers/db.ts          허락 후: bible_verse 테이블
    index.ts                 BIBLE_PROVIDER 에 따른 선택
    joshua.ts                장별 절 수 등 비저작물 메타데이터
  auth.ts
  db/ index.ts, schema.ts
  data/                      서버 전용 조회/변경 (viewer, progress, stats, comments, roster)
  avatar.ts
components/
  JourneyMap, DayHero, ChapterText, AvatarStack, ProgressDots, CompletionMoment, CommentList ...
scripts/
  import-selah-roster.ts     CSV → roster_entry/cell (dry-run 지원)
data/private/                이관 CSV 임시 위치 (.gitignore, 이관 후 삭제)
```

---

## 3. 인증

- Auth.js v5 + Kakao + `DrizzleAdapter` + `session.strategy = "database"`. 테이블은 **길갈 DB에 독립 구축**.
- **같은 카카오 앱(REST API 키)을 사용해야 한다.** 카카오 회원번호는 앱 단위로 발급되므로, 별도 앱을 만들면 Selah 회원과 연결할 수 없다(ADR-012).
- 세션: 길갈 DB `session` 테이블, 길갈 도메인 쿠키. Selah 세션과 무관(각 서비스에서 각각 로그인).
- `callbacks.session`: `session.user.id` 만 싣는다. 프로필·셀·관리자 여부는 요청당 1회 `getViewer()`(React `cache`)로 `profile ⋈ cell` 조회. Auth.js 테이블을 표준 그대로 두기 위함(ADR-014).
- `events.signIn`(user 행 생성 후 실행): `profile` 이 없으면 생성하고 카카오 ID로 명단 매칭(5.3).
- 카카오 동의항목은 Selah와 같은 앱 설정을 따른다. 길갈은 닉네임 외 프로필 이미지/이메일을 화면에 쓰지 않는다.

### 3.1 환경변수

| 키 | 용도 | 비고 |
|---|---|---|
| `DATABASE_URL` | 런타임 DB (Supavisor 트랜잭션 모드 :6543) | 길갈 Supabase |
| `DIRECT_URL` | drizzle-kit migrate, import 스크립트 (세션 모드 :5432) | 로컬/운영자 PC에서만 사용. Direct(`db.*.supabase.co`)는 IPv6 전용이라 IPv4 환경에서 접속 불가 → **Session pooler(:5432)** 사용 |
| `AUTH_SECRET` | Auth.js 서명 | **길갈 전용 새 값** (`npx auth secret` 또는 `openssl rand -base64 32`) |
| `AUTH_URL` | 필요 시에만 | Vercel 기본 도메인(`*.vercel.app`)에서는 불필요(`AUTH_TRUST_HOST` 자동). 콜백 URL 불일치가 나면 실제 도메인으로 설정 |
| `AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET` | 카카오 REST API 키 / Client Secret | **Selah와 같은 카카오 앱의 값**. Selah와 같은 이름 `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET` 도 허용 |
| `GILGAL_CAMPAIGN` | 활성 캠페인 slug | 기본 `joshua-2026`, 테스트 `joshua-2026-test` |
| `BIBLE_PROVIDER` | `mock` \| `db` | 본문 적재 전 `mock`, 적재 후 `db` (8.5, ADR-019) |
| `GILGAL_DEV_NOW` | 현재 시각 오버라이드 | `VERCEL_ENV === "production"` 에서는 무시 |

DB 연결은 `DATABASE_URL`/`DIRECT_URL` 두 변수로만 결정된다. 나중에 개발용 DB를 만들면 로컬·Preview 환경의 두 값만 바꾸면 된다(ADR-015).

길갈은 `NEXT_PUBLIC_SUPABASE_URL`, anon/publishable key, service role key 를 **사용하지 않는다**.

---

## 4. 새 Supabase 프로젝트 초기 설정 (운영자 작업)

1. **프로젝트 생성**: 리전 `Northeast Asia (Seoul)`, 강한 DB 비밀번호(비밀번호 관리자에 보관). 프로젝트명 예: `gilgal`.
2. **연결 문자열 확보**(Connect 메뉴):
   - Transaction pooler(:6543) → `DATABASE_URL`
   - Session pooler(:5432) 또는 Direct → `DIRECT_URL`
3. **Data API 비활성화**(권장): 길갈은 Supabase 클라이언트를 쓰지 않으므로 PostgREST 노출이 필요 없다. 비활성화가 어려우면 노출 스키마에서 `public` 제거. (어느 경우든 모든 테이블 RLS 활성화 — 6.2)
4. **Supabase Auth 미사용**: Auth 설정은 건드리지 않는다(사용자는 Auth.js 테이블에 저장).
5. **플랜 확인**: 비활성 시 일시 중지 정책, 백업 정책을 확인한다. 길갈은 **12/5 이후에도 종료일 없이 이용 가능**해야 하므로 일시 중지가 서비스 중단으로 이어지지 않는지 확인 필요.
6. **프로젝트는 하나만**: 개발·초기 테스트도 이 프로젝트를 사용한다. `gilgal-dev` 는 만들지 않는다(ADR-015, 9.3).
7. **Vercel**: 새 프로젝트(길갈 저장소 연결), 커스텀 도메인 없이 **Vercel 기본 도메인** 사용(예상 `https://project-gilgal.vercel.app`, 실제 할당 주소 기준). 환경변수 3.1 설정, 함수 리전 `icn1`.
8. **카카오 개발자 콘솔**(Selah와 같은 앱) — **기존 Redirect URI·도메인은 삭제·변경하지 않고 추가만** 한다.
   - 플랫폼 > Web 사이트 도메인: `http://localhost:3000`, `https://<실제-vercel-도메인>`
   - 카카오 로그인 Redirect URI: `http://localhost:3000/api/auth/callback/kakao`, `https://<실제-vercel-도메인>/api/auth/callback/kakao`
   - 실제 도메인은 첫 Vercel 배포 후 확정되므로, 로컬 URI를 먼저 추가하고 운영 URI는 배포 직후 추가한다.
   - Preview 배포 URL(브랜치마다 바뀜)은 등록하지 않는다. 로그인 테스트는 로컬과 운영 도메인에서만.
9. 첫 마이그레이션은 Claude가 SQL을 생성·제시 → 승인 → `DIRECT_URL` 로 `drizzle-kit migrate`.

---

## 5. 사용자·셀 재사용 설계

### 5.1 대안 비교

| | ① 같은 카카오 앱 + 길갈 독립 Auth.js | ② Selah 사용자·셀 초기 이관 | ③ Selah와 지속 동기화 |
|---|---|---|---|
| 하는 일 | 길갈 자체 user/account/session. 카카오 회원번호로 사람 식별 | Selah에서 (카카오 ID, 실명, 셀) 최소 항목을 1회 가져와 명단에 적재 | 정기/실시간으로 Selah 변경을 길갈에 반영 |
| 단독 사용 시 | 로그인은 되지만 실명·셀을 모두 새로 입력해야 함 | 단독으로는 불가(로그인 수단 필요) | — |
| Selah 의존 | 없음 | 오픈 전 1회 읽기 | 지속적(장애·권한·비밀정보 공유) |
| 복잡도 | 낮음 | 낮음(스크립트 1개) | 높음(충돌 해결, 스케줄러, Selah 접속 정보 보관) |
| 개인정보 | 길갈 가입 시점에 본인 동의 하 수집 | 최소 항목만, 1회 | 상시 복제 |

**권장: ① + ②, ③은 하지 않는다.** (ADR-013)
- ①로 길갈 고유 세션/계정을 만들고, ②로 오픈 전 Selah의 셀 배정 결과를 "명단(roster)"으로 한 번 가져온다.
- 로그인 시 카카오 회원번호로 명단과 자동 매칭 → 기존 Selah 회원은 **입력 없이** 실명·셀이 채워진다.
- 이관 이후 셀 변경은 **길갈이 원본**이다(관리자 수정). Selah와 다시 맞추지 않는다. 오픈 전 셀 편성이 바뀌면 이관 스크립트를 다시 실행(멱등 upsert)한다.

### 5.2 초기 이관 (오픈 전 1회)

**원칙**: 길갈(및 Claude)은 Selah DB에 접속하지 않는다. 운영자가 Selah Supabase 대시보드 SQL Editor에서 아래 **읽기 전용 SELECT** 를 실행해 CSV로 내려받는다(DDL/DML 없음).

```sql
-- A. Selah 회원: 카카오 회원번호 ↔ 실명 ↔ 셀 (온보딩 완료자, 실제 셀 배정자만)
SELECT a."providerAccountId" AS kakao_id,
       u."realName"          AS real_name,
       u."cellName"          AS cell_name
FROM   "user" u
JOIN   account a ON a."userId" = u.id AND a.provider = 'kakao'
WHERE  u."onboardingCompleted" = true
  AND  u."realName" IS NOT NULL
  AND  u."cellName" IS NOT NULL AND u."cellName" <> '미배정';

-- B. 교회 명단: Selah에 가입하지 않은 사람 포함 (실명 매칭용)
SELECT "kakaoId" AS kakao_id, name AS real_name, "cellName" AS cell_name
FROM   cell_roster;
```

- 이관 항목은 **카카오 회원번호, 실명, 셀 이름 3개뿐**. 이메일·닉네임·프로필 이미지·토큰·세션·Selah user.id·출석/암송 기록은 가져오지 않는다.
- CSV는 `data/private/`(gitignore)에 두고, `pnpm import:selah --dry` 로 결과 확인 → 승인 → 실제 적재 → **CSV 즉시 삭제**.
- 스크립트 동작: 셀 이름 정규화 → `cell` upsert → A를 우선으로 `roster_entry` upsert(kakao_id 기준), B는 A와 겹치지 않는 행만 (real_name, cell) 기준 추가. 이미 `claimed` 된 행과 관리자 수정 행(`source='admin'`)은 덮어쓰지 않는다. 충돌(같은 kakao_id가 다른 셀 등)은 리포트로 출력하고 적재하지 않는다.
- **셀 편성의 기준은 Selah가 관리하던 셀 목록과 명단 그대로**다. 11월 기준 최신 여부는 확인하지 않는다(확정). 셀 목록은 B(`cell_roster`)의 셀 이름 집합으로 만들고, Selah `lib/db/cellData.ts`(26개 셀)와 개수·이름을 대조해 누락을 점검한다. 실명이 담긴 명단은 저장소에 커밋하지 않는다.
- 이관 후 셀 정보의 원본은 길갈 DB다. 잘못된 셀 정보는 **운영자가 Supabase에서 직접 수정**한다(MVP에 관리자용 셀 편성 화면 없음).

### 5.3 온보딩 흐름 (Selah 방식 재사용, 확정)

Selah의 3단계 배정(카카오 ID → 실명 → 직접 선택)과 화면 흐름을 그대로 따른다. 대부분의 사용자는 1단계에서 입력 없이 끝난다.

```
① 카카오 로그인
   → Auth.js가 길갈 user/account 생성(첫 로그인) → events.signIn
   → profile 없으면 생성 (kakao_id, avatar_seed 랜덤, onboarding_status='pending')
② roster_entry WHERE kakao_id = 회원번호   (회원번호는 서버가 OAuth 결과에서 얻은 값)
   ├ 있음 → ③ 실명·셀 자동 설정, status='matched', 행 claim → 홈
   └ 없음 → /onboarding
④ /onboarding: 실명 입력
   → roster_entry WHERE real_name = 정규화(입력) AND kakao_id IS NULL AND claimed_by IS NULL
   ├ 정확히 1개 → 그 셀로 배정, 행에 kakao_id 백필·claim, status='matched' → 홈
   └ 0개 / 2개 이상(동명이인) → ⑤
⑤ 셀 직접 선택: 기존 셀 목록(cell.active)에서 고르는 선택지만. 자유 텍스트 없음.
   → status='manual', 실명·cell_id 저장 → ⑦ 온보딩 완료 → 홈
```

- Selah와의 차이: Selah의 "미배정" 선택지는 두지 않는다(확정: 기존 셀 목록에서 반드시 선택). 셀이 없는 사람(교역자 등)은 Selah 명단의 해당 그룹("백목사님", "양육셀" 등)을 선택한다.
- Selah는 수동 선택 결과를 명단에 백필했다. 길갈은 **수동 선택 결과를 명단에 쓰지 않는다**(검증되지 않은 자기 신고를 명단 원본에 섞지 않기 위함). 수동 선택자는 `profile.onboarding_status='manual'` 로 구분되어 운영자가 DB에서 확인할 수 있다.
- 온보딩 완료 조건: `profile.real_name` 과 `profile.cell_id` 가 모두 있음. 미완료 사용자는 홈/읽기 화면 접근 시 `/onboarding` 으로 보낸다.

### 5.4 계정 연결 보안 검토

| 위협 | 대응 |
|---|---|
| 클라이언트가 카카오 회원번호/다른 userId를 위조해 남의 명단 행에 연결 | 회원번호는 **Auth.js가 카카오 토큰 교환으로 얻은 `account.providerAccountId` 만** 사용. 서버 액션·폼 어디에서도 회원번호·userId·rosterId를 입력으로 받지 않는다 |
| 카카오 회원번호가 다른 사람에게 연결된 명단 행 탈취 | `kakao_id` 가 채워진 행은 **같은 회원번호로만** claim 가능. 실명 매칭은 `kakao_id IS NULL` 행만 대상 |
| 타인 실명을 입력해 그 사람의 명단 행(실명·셀)을 선점 | 근본적으로 막을 수 없는 Selah와 같은 한계. 완화: ① 미점유·`kakao_id` 없는 행만, ② 정확히 1건일 때만, ③ 사용자당 실명 매칭 **1회 성공만**(이미 claim한 사용자는 재매칭 불가, `claimed_by` UNIQUE), ④ 실명 매칭 시도 횟수 제한(사용자당 5회), ⑤ `claimed_at`·매칭 방법을 남겨 운영자가 추적, ⑥ 피해 범위는 표시 이름·셀 소속뿐(명단 행에는 다른 데이터가 없음) |
| 선점당한 실제 본인 | 실명 매칭 0건 → 셀 직접 선택으로 정상 진행. 운영자가 DB에서 claim 해제·정정 |
| 동시 요청으로 한 명단 행이 두 사람에게 claim | `UPDATE roster_entry SET claimed_by=$me WHERE id=$id AND claimed_by IS NULL` 의 영향 행 수로 판정(조건부 업데이트), `claimed_by` UNIQUE |
| 셀 선택값 위조(존재하지 않는/비활성 셀) | 서버에서 `cell.id` 존재·`active` 검증. 이름 문자열이 아닌 id로 저장 |
| 이메일 기반 자동 계정 병합 | 사용하지 않음(`allowDangerousEmailAccountLinking` 미사용, 카카오 단일 공급자) |
| 실명 입력 정규화 차이로 오매칭 | 앞뒤 공백 제거·내부 공백 제거 후 **완전 일치**만 허용. 유사 매칭 없음 |

- 카카오 회원번호가 같으면 같은 사람으로 본다. 길갈에서 계정을 삭제하면 profile·progress·comment는 cascade 삭제, roster_entry는 claim만 해제(`ON DELETE SET NULL`).

### 5.5 신규 회원 정책

- Selah에 없던 사람도 카카오 로그인 → 온보딩(5.3)으로 참여 가능. 별도 승인 절차 없음(교회 공동체 대상, 링크로 공유).
- 본인 셀 변경 UI는 두지 않는다. 정정은 운영자가 Supabase에서 직접.

### 5.6 개인정보 최소화와 안내

- 로그인/온보딩 화면에 안내: "셀라에서 사용하던 이름과 셀 정보를 불러와 연결합니다." + 정정 문의 방법.
- 미가입자 명단 행(claim 안 된 `roster_entry`)은 캠페인 종료 후 정리(삭제 시점은 11절).
- 관리자 권한(`profile.is_admin`)은 이관하지 않고 운영자가 길갈 DB에서 직접 지정.

---

## 6. 보안 및 권한

### 6.1 기본 원칙

1. **userId는 항상 서버 세션에서.** 서버 액션 입력에는 대상(`dayNo`, `commentId`, `content`)만 받는다. `userId`/`cellId` 를 입력으로 받지 않는다.
2. **모든 쓰기는 소유권 조건을 WHERE에 포함.** 예: `UPDATE comment ... WHERE id=$1 AND user_id=$session AND deleted_at IS NULL`.
3. **공개 정책은 서버에서 검증**(7절). 미래 DAY 완료/댓글은 화면과 무관하게 거부.
4. 데이터 접근은 `lib/data/*` 서버 전용 모듈(`import "server-only"`)에 모은다.
5. 입력 검증: 댓글 1~1000자, 공백만 금지, 사용자당 짧은 시간 내 작성 횟수 제한(DB 기준).
6. 관리자 기능은 `profile.is_admin` 서버 검사.

### 6.2 RLS / DB 노출 (ADR-006 개정)

- Supabase Auth를 쓰지 않아 `auth.uid()` 정책 불가. 앱은 서버에서 DB 소유 롤로 접속하므로 RLS는 앱 요청에 적용되지 않는다.
- 권한 강제는 서버 계층(6.1). DB는 외부 직접 접근 차단:
  - Data API 비활성화(권장) 또는 노출 스키마 제거.
  - **모든 테이블 `ENABLE ROW LEVEL SECURITY`, 정책 없음** → anon/authenticated 전면 거부. 마이그레이션에 포함.
  - `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;` 및 default privileges 동일 적용.
- 선택 강화(Phase 3 점검): 앱 전용 DB 롤(테이블 CRUD만, DDL 불가)로 런타임 접속, 마이그레이션은 소유 롤로.

### 6.3 노출 최소화

| 데이터 | 노출 범위 |
|---|---|
| 내 진행 상태 | 본인만 |
| 공동체 통계 | 숫자 + 완료자 아바타 일부(이름 없음). 미시작자는 **숫자만** |
| 셀 통계 | 같은 셀 멤버에게만: 숫자 + 완료자 아바타(이름) + 미시작자는 흐린 아바타 묶음(이름 없음, 상호작용 없음) |
| 다른 사람의 날짜별 이력 | 노출하지 않음 |
| 댓글 | 로그인한 참여자에게만. 표시명 + 아바타 |
| 카카오 회원번호 | 화면/클라이언트로 내보내지 않음 |

- 통계는 서버에서 집계해 필요한 필드만 직렬화한다. 클라이언트로 user id 목록을 보내지 않는다(아바타는 seed만).
- 표시명은 **실명**(`profile.real_name`, 확정). 온보딩 완료자만 화면에 나타나므로 항상 존재한다.

---

## 7. 일정·공개 정책 (확정)

모든 판단은 **KST 날짜**, `lib/journey/schedule.ts` 순수 함수, **서버에서 검증**.

**단일 규칙: `day.readingDate <= todayKst` 이면 공개(열람·완료·댓글 가능), 아니면 잠금. 종료일 없음.**

| 구간 | 기간 | 공개 | 홈 화면 |
|---|---|---|---|
| 기간 전 | ~ 11/1 | 없음 | 출발 준비(D-n), 여정 소개 |
| 정식 | 11/2(월) ~ 11/28(토) | 월~토 하루 1장. 11/2→1장 … 11/28→24장(검증 완료) | 오늘의 여정 |
| 주일 | 11/8, 15, 22, 29 | 새 장 없음, 공개된 장 열람·완료 가능 | 쉼의 날 + 아직 걷지 않은 길 |
| Catch-up | 11/30(월) ~ 12/5(토) | 새 장 없음(24장 모두 이미 공개) | 미완료자: "아직 걷지 않은 길" / 완주자: 회고 |
| 종료 후 | 12/6 ~ | 24장 모두 계속 열람·완료 가능 | 여정 지도·진행도·회고·댓글 유지 |

- 확정 정책 1~7(requirements 13절)은 위 규칙 하나로 모두 성립한다. Catch-up은 공개 범위에 영향이 없는 **안내 UX 구간**일 뿐이다.
- 완료 서버 액션: `dayNo` 범위 → 공개 여부 → `INSERT ... ON CONFLICT DO NOTHING` → `{ status: "completed" | "already" }`.
- "오늘의 DAY" = `readingDate == todayKst` 인 날(없으면 null).
- 단위 테스트 필수 케이스: 24개 날짜 매핑, 각 주일, 11/28 23:59/11/29 00:00 KST, 11/30, 12/5, 12/6, 2027-01-01, UTC 14:59/15:00 경계.

### 공동체 "오늘" 지표

- 정식 기간 평일: `오늘 DAY 완료자 수 / 참여자 수`.
- 주일·Catch-up·종료 후: "오늘 함께 걸은 사람"(오늘 KST에 어떤 DAY든 완료한 고유 사용자) + 누적 완주자.
- 참여자(분모) = **길갈 온보딩을 완료한 사용자 수**(확정). 테스트 계정(`profile.is_test`)은 제외.

---

## 8. 기능별 설계

### 8.1 여정 설정 (`lib/journey`)

```ts
type JourneyDay = {
  day: number;            // 1..24
  chapter: number;        // 여호수아 n장 (= day)
  readingDate: string;    // KST YYYY-MM-DD — 시작일+주일 제외 규칙으로 생성, 테스트로 고정
  act: 1 | 2 | 3 | 4;
  title: string;          // "요단강을 건넘"
  ordinalLine: string;    // "약속의 땅을 향한 여덟 번째 걸음"
  locationId?: LocationId;
  mapMode: "journey" | "territory" | "review";   // Phase 2에서 표현 차등
  mapEffect?: MapEffect;  // Phase 2: 'cross-jordan' | 'fill-tribe' | 'move-base' | 'refuge-cities' | 'return-east' | 'overview'
  completion: { emoji?: string; headline: string; body?: string };
};
```

- 캠페인 메타(`campaign.ts`): slug, title, book, startDate, endDate, catchupStart/End, totalDays.
- 모든 문구·좌표·ACT·완료 메시지는 이 폴더에만. 수정 = 파일 수정 후 배포(ADR-003).
- 장 소개는 제목/장소 수준. 신학적 해설은 쓰지 않는다(요구사항 핵심 4).

### 8.2 여정 지도 (`components/JourneyMap`)

교육용 **schematic map**, 인라인 SVG, 외부 의존성 없음. 실제 GPS 좌표를 쓰지 않고 "위치는 이야기 흐름을 위한 개략적 표현입니다" 캡션 표시.

**Phase 1 (오픈 포함)**
- 모바일 세로형 viewBox(예: 0 0 360 520). 지중해 해안선 단순 곡선, 요단강 세로선, 갈릴리·사해 간략 형태, 산지 질감은 최소.
- 주요 지점(요단 동쪽 진영, 요단강, 길갈, 여리고, 아이, 에발산, 기브온, 헤브론, 하솔, 실로, 세겜)과 이야기 순서의 경로.
- 입력 `completedDays`, 출력은 순수 함수 `mapView()`(`lib/journey/mapState.ts`, ADR-022):
  - 완료한 장의 지점 = 활성(채운 아이콘 + 이름), 아직 걷지 않은 지점 = 옅은 아이콘.
  - ~~현재 위치 마커 = 완료한 가장 큰 DAY의 지점~~ **[변경 2026-10-24]** 내 위치 = 1장부터 이어서 읽은 마지막 장의 지점. 아바타는 장소 아이콘 옆(가리지 않게).
  - 1장~내 위치 = 옅은 실선. ~~내 위치~깃발(오늘 장) = 점선~~ [변경 2026-10-26] 아직 걷지 않은 길은 그리지 않는다(깃발만 표시). 가나안 영역은 3장 완료 전 점선 경계, 완료 후 옅게 채움.
  - 지도 컴포넌트는 `components/map/JourneyMap.tsx` 하나 — props 로 내 위치·깃발·선택 장소·특정 장소 강조(focus)·도착 연출·확대 영역(crop)을 나눈다. 장소 아이콘은 `components/map/SiteGlyph.tsx`(교체용).
  - 완료 구간 경로 = 실선. ~~앞선 미완료 구간 = 점선~~ [변경 2026-10-26] 그리지 않음.
  - 장소가 없는 장(12, 13~17, 19~23 등)은 직전 지점 또는 ACT 거점(길갈/실로)에 머무는 규칙을 설정 파일에 명시.
- 홈: 미니 지도(오늘의 DAY 지점 강조 + 내 위치) → 탭하면 `/journey`.
- `/journey`: 전체 지도 + 24개 점 + 아직 걷지 않은 길 목록.
- 애니메이션은 마커 이동 1회(CSS transition) 정도. `prefers-reduced-motion` 존중.

**Phase 2 (고도화)**
- 3장 요단강 횡단 애니메이션, ACT별 표현 전환(journey → territory → review), 13~19장 지파 영역 채우기, 18장 거점 길갈→실로, 20장 도피성 마커, 22장 동편 귀환, 12장/23장 회고 화면, 지도 위 동행자 아바타.

### 8.3 아바타 (DiceBear Marbles) (ADR-007)

- `@dicebear/core`(v10) + `@dicebear/styles/marbles.json` 을 서버에서 사용해 SVG 생성(ADR-007). 외부 API 호출 없음.
- seed: `profile.avatar_seed`(가입 시 랜덤, 고정). userId/이름/카카오 ID를 seed로 쓰지 않는다.
- ~~`GET /api/avatar/[seed]`~~ **[변경 2026-10-29]** `GET /api/avatar/[key]` → `image/svg+xml`, `Cache-Control: public, max-age=31536000, immutable`. 목록에서는 `<img>` 로 사용.
- **[변경 2026-10-29] 꾸미기(ADR-027)**: `profile.avatar_options`(jsonb) 에 고른 부품 `{ top, eyes, mouth, nose, glasses, face, color }` 를 저장한다. 부품 목록·검증은 `lib/avatarParts.ts`(클라이언트 공용), 그리기는 `lib/avatar.ts`.
  - 아바타 키 = `seed` 또는 `seed~머리.눈.입.코.안경.얼굴.색`. 데이터 계층이 `avatarKeyOf(seed, options)` 로 만들어 화면에 보내고, `Avatar`·지도는 키만 받는다(`avatarKey`). 꾸미지 않은 사람은 키 = seed, 그림도 이전과 같다(테스트로 확인).
  - 안경·얼굴(볼터치·주근깨)은 Marbles 에 없어 정의(CC0)를 복사해 같은 선 굵기·잉크색으로 그려 붙였다. 기본 확률 0.
  - [변경 2026-11-01] 어둡거나 부정적인 인상의 부품을 뺐다: 얼굴 점·콧수염·턱수염, 선글라스, 입 시무룩·메롱. 반무테는 온테 "웰링턴"으로. 이미 고른 저장값은 그 부위만 "없음"으로 읽고(`parseAvatarParts`), 꾸미지 않은 아바타에 뺀 입이 나오면 seed 로 정한 다른 입으로 그린다. 그림 버전 `navy3`. 긴 웨이브도 뺐다가(`navy4`) 오른쪽이 볼에 붙어 보이던 것을 왼쪽과 대칭으로 고쳐 되살렸다(`navy5`). 짧은 남자 머리 3종(짧은 머리·옆가르마·짧은 곱슬)을 길갈 머리로 더했다 — Marbles 머리는 정수리 몇 가닥이라 평범한 짧은 커트를 고를 수 없었다.
  - [추가 2026-10-29] 긴 머리·묶은 머리 8종(단발·앞머리 단발·긴 생머리·긴 웨이브·포니테일·양갈래·올림머리·땋은 머리)도 같은 방식(구슬 바깥을 감싸는 잉크 선)으로 그렸다. Marbles `top` 변형에 넣으면 꾸미지 않은 사람의 머리가 다시 뽑히므로 별도 부위 `hair` 로 두고, 꾸미기에서는 "머리" 탭의 보기로 고른다(키 형식은 그대로).
  - [추가 2026-10-29] Marbles 캡모자(`top.cap`)는 모자로 잘 읽히지 않아 그림만 바꿔 끼웠다(다른 모자처럼 채움 없는 선, 깊은 정수리 + 왼쪽 옆챙, 띠는 머리 폭에 맞게 — 정면 챙은 얼굴에 겹쳐 띠처럼 보여 옆챙으로). 오픈 전이라 seed 로 캡이 뽑힌 사람도 새 그림을 쓴다. 같은 날 그려 본 남자 짧은 머리 7종은 선 그림으로는 구분이 안 돼 뺐다.
  - `/me` 꾸미기 화면: 부위 탭 → "지금 모양에서 그 부위만 바꾼" 보기 칸 → 저장. 섞기(부품+무늬), 색 탭의 "구슬 무늬 바꾸기"(seed 만).

### 8.4 참여 시각화 — **[변경 2026-10-24] 오픈 포함, ADR-022**

- 홈 "오늘 N장까지 읽은 사람": 오늘 장 완료 시각 순 1st/2nd/3rd + 4번째부터 아바타 6개와 인원수 + 내 줄(도착 전/후). 주일에는 가장 최근에 열린 장 기준, 보충 기간·종료 후에는 "오늘의 공동체" 숫자 카드.
- 셀 카드: 기준 장(깃발 장, 보충 기간 이후에는 24장 전체)을 완료한 셀원은 이름과 함께 선명하게, 아직인 셀원은 흐리게. ~~이름은 서버에서부터 보내지 않는다.~~ [변경 2026-10-26] 아직인 셀원도 이름을 보낸다(같은 셀 안에서만).
- 로컬 테스트 캠페인(`joshua-2026-test`)에서는 테스트 계정만, 운영 캠페인에서는 테스트 계정을 뺀 사람만 센다.

원래 설계(Phase 2):

- `AvatarStack`: 최대 8개 겹친 원형 + `+N`, 최근 완료 순.
- 공동체: "오늘 37명이 여정을 마쳤어요" + 아바타 8 + `+29`. 미시작은 "아직 12명의 동행자가 오늘 여정을 시작하지 않았어요" **숫자 문구만**.
- 셀: "우리 셀 8 / 11명" + 완료자 아바타 + 미시작자 흐린 아바타 묶음(이름 없음).
- 제안: 지도 위 "오늘 이 지점에 도착한 동행자" 아바타(Phase 2 후반 선택).

### 8.5 성경 본문 (ADR-008 개정)

#### 대한성서공회 페이지 분석 (2026-10-19, 구조만 확인)

- URL: `https://www.bskorea.or.kr/bible/korbibReadpage.php?version=GAE&book=jos&chap={장}&sec={절}` — `version=GAE`(개역개정), `book=jos`(여호수아). **장 단위 딥링크가 가능**하다.
- 본문은 서버 렌더링 HTML이며, 절은 "절 번호 + 본문" 줄 단위, 장 안에 **소제목**이 별도 블록으로 들어 있다. 공개 API·다운로드 링크는 없다.
- 공식 표기: "성경전서 개역개정판 © 대한성서공회 1998". 성경 플랫폼(bible.bskorea.or.kr) 안내에 따르면 해당 사이트의 콘텐츠도 저작권자 허락하에 게시된 것이다.
- 개역개정은 저작권 보호 중(개역한글은 보호기간 만료로 알려져 있으나 길갈은 개역개정을 원함). 앱 사례를 보면 대한성서공회 허락이 **기간제 이용 계약** 형태로 이뤄지는 것으로 보이며, 구체적 조건·절차는 공식 문의로 확인해야 한다.

#### 목표 UX (확정, ADR-016)

**외부 사이트로 이동하지 않고 길갈 안에서 읽기부터 완료까지 진행한다.**
여호수아 1~24장 본문을 길갈 화면에 장·절 구분해 표시하고, 본문 아래에 읽기 완료 버튼과 댓글·공감을 이어 붙인다.
이를 위해서는 본문의 복제·저장·공중송신에 대한 대한성서공회 이용 허락이 필요하다. 허락 전에는 Mock 본문으로 기능을 완성해 두고, 허락 후 데이터만 연결한다.

#### 열람 vs 복제·배포 구분

| 행위 | 판단 |
|---|---|
| 사용자가 대한성서공회 사이트에서 읽도록 **링크** | 허락 없이 가능(원 사이트에서 열람). 길갈의 기본 방식은 아님 — 비상 대안으로만 기록 |
| 길갈 서버가 본문을 **수집(크롤링)** | 복제에 해당 → 허락 전 금지. 서버 렌더링이어도 기술적 가능 여부와 무관 |
| 길갈 DB/파일에 본문 **저장** | 복제 → 허락 필요 |
| 길갈 화면에 본문 **표시** | 공중송신/배포 → 허락 필요 |
| iframe으로 원 사이트 삽입 | 원 사이트 정책 확인 필요, 모바일 UX도 나쁨 → 채택하지 않음 |
| 장·절 번호, 절 수, 장 제목(길갈 자체 작성) | 저작물 아님 → 사용 가능 (소제목 원문은 본문과 같이 취급) |

#### 설계

```ts
type BibleBookCode = "jos";
type BibleRef = { translation: "GAE"; book: BibleBookCode; chapter: number };
type Verse = { number: number; text: string };
type Section = { heading?: string; verses: Verse[] };   // 소제목 단위 묶음 (소제목 없으면 1개)
type ChapterText = {
  ref: BibleRef;
  sections: Section[];
  verseCount: number;          // lib/bible/joshua.ts (비저작물 메타)와 일치해야 함
  attribution: string;         // 표기 문구 (Mock: "Mock 본문 — 실제 성경 본문이 아닙니다")
  source: "mock" | "static" | "db";
};
interface BibleTextProvider {
  getChapter(ref: BibleRef): Promise<ChapterText>;
}
```

| Provider | 용도 | 상태 |
|---|---|---|
| `mock` | 허락 전 개발·테스트·화면 구현. 실제 절 수만큼 "여호수아 n장 m절 — Mock 본문" 생성. 모든 화면에 Mock 배지 표시 | Phase 1 |
| `static` | 허락 후: 장별 JSON(`{ chapter, sections:[{heading?, verses:[{number,text}]}] }`) 24개. 위치는 허락 조건에 따라 결정(저장소 커밋 가능 여부 포함) — 기본안은 **저장소 밖**(`BIBLE_DATA_DIR`) 또는 빌드 시 주입 | 허락 후 |
| `db` | 허락 후: `bible_verse(translation, book, chapter, verse, section_heading, text, PK(translation,book,chapter,verse))`. 적재 스크립트로 24장 일괄 입력 | 허락 후 |

- **원문 확보 시 연결 절차**: ① 허락 조건에 맞는 공식 데이터 수령 → ② 변환 스크립트로 장별 JSON 또는 `bible_verse` 적재 → ③ 검증 스크립트: 24장 존재, 장별 절 수가 `joshua.ts` 와 일치, 빈 절 없음 → ④ `BIBLE_PROVIDER` 변경 → 배포. 화면 코드 변경 없음.
- 화면 컴포넌트 `ChapterReader` 는 `ChapterText` 만 받아 렌더링 → Provider 교체 시 UI 변경 없음.
- 본문 UX: 세리프 본문 17~18px, 줄간격 1.8, 절 번호는 작은 위첨자 색상 구분, 소제목은 산세리프 소형 라벨, [변경 2026-10-26] 읽기 설정(글자 크기·글꼴·굵기·줄 간격·배경, 쿠키 저장, ADR-026), 텍스트 선택 복사 기본 허용(허락 조건에 따라 조정). 본문 끝 → 저작권 표기 → **읽기 완료 버튼** → 댓글. [변경 2026-10-29] 도착 화면은 "나눔 남기기"(주) · "N장 이어 읽기"(보조) · "홈으로"(글자) 순, 지도 위 닫기(X)는 없앰. "나눔 남기기"를 누르면 도착 화면이 닫히고 화면 아래에 입력창(`DockComposer`)이 붙어 본문을 다시 보며 쓴다 — 열려 있는 동안 절을 누르면 "장:절"이 커서 자리에 들어간다. 남기면 입력창이 닫히고 나눔 목록으로 내려간다. [추가 2026-10-29] 본문 아래 나눔 자리는 입력창과 같은 모양 대신 "내 아바타 · N장을 읽고 마음에 남은 것을 나눠 주세요 · 연필" 한 줄이고, 누르면 같은 입력창이 열린다. 쓰던 글은 장별로 이 기기에 임시저장(localStorage, 30일, 남기면 삭제)되어 화면이 닫혀도 다시 들어오면 "쓰던 나눔 이어 쓰기"로 이어진다. 바로 이어지는 절을 누르면 "16:1-2" 로 범위가 늘고, 고른 절을 다시 누르면 그 절만 빠지며(범위는 줄거나 둘로 나뉨). 누를 때마다 이 장에서 고른 절을 이어진 덩어리마다 한 범위로 정리한다 — 순서·위치와 상관없이 "16:5 16:7-8 16:6" → "16:5-8", 범위는 처음 나온 자리에, 고른 절은 본문에 옅게 표시된다(`lib/share/verseRef.ts`). 들어간 구절은 입력창 위 칩(누르면 그 절 본문 시트)으로 보이고, 입력칸 안에서도 배경색으로 강조한다 — textarea 는 그대로 두고 같은 글을 뒤에 겹쳐 구절만 칠한다(리치 편집기는 휴대폰 한글 조합 입력 문제가 잦아 쓰지 않음). 본문 상단 바는 "‹ 오늘" 글자 버튼(하단 탭이 없는 화면의 나가는 길)을 두고 화면 위에 붙어, 내려 읽을 땐 숨고 위로 올리면 다시 보인다(`StickyBar`). 나눔 고치기도 같은 하단 입력창(`ComposerDock`)을 쓰고, 입력창은 한 번에 하나만 열린다(장 본문 화면에서만 절 누르기). 나눔 카드의 구절 표기를 누르면 그 절 본문을 시트로 보여 준다(`getVersesAction` — 본문 화면과 같은 Provider·공개 규칙, 30절까지. 시트 본문도 읽기 설정 쿠키의 글자 크기·글꼴·굵기·줄 간격을 따른다).
- 운영 서버에서 `mock` 은 경고 배지와 함께만 동작한다(실수로 Mock을 실제 본문처럼 보이지 않게).
- 여호수아 장별 절 수(개역개정 기준, 데이터 확보 시 재검증): 18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33 (총 658절).

#### 오픈 시점에 허락이 없을 경우 (결정 필요)

서비스 내 본문 제공이 확정 방침이므로, 11/2까지 허락을 받지 못하면 다음 중 하나를 선택해야 한다. Mock 본문을 실제 사용자에게 내보내지는 않는다.

1. 허락이 나올 때까지 해당 장 화면에 "본문 준비 중" + 임시로 대한성서공회 해당 장 링크 제공(`link` provider를 비상용으로만 추가)
2. 오픈 연기

#### 운영자 TODO — 본문 이용 허락

- [ ] 대한성서공회 저작권 담당 부서에 문의: 개역개정 **여호수아 1~24장 전문**을 비영리 교회 공동체 웹 서비스 안에서 **복제·저장·화면 제공(공중송신)** 하는 이용 허락
- [ ] 문의 시 전달할 정보: 서비스 목적(비영리, 교회 공동체 통독), 예상 이용자 수(약 150명), 기간(2026-11-02 ~ 종료일 없음 → 유지 기간 협의), 범위(여호수아 1~24장, 소제목 포함 여부), 형태(로그인 사용자 대상 웹 화면, 일괄 다운로드 기능 없음), 저장 형태(서버 DB 또는 정적 파일), 운영 주체
- [ ] 확인할 조건: 이용료, 허락 기간·갱신, 필수 저작권 표기 문구·위치, 저장 방식 제한(소스 저장소 커밋 가능 여부), 데이터 제공 여부(공식 파일 제공 vs 직접 입력), 텍스트 복사 허용 여부, 서비스 종료 후 삭제 의무
- [ ] 허락서(또는 이메일) 보관, 허락 기간과 조건을 `docs/bible-license.md` 에 기록
- [ ] 허락 후: 공식 제공 데이터로 `static`/`db` provider 연결(웹페이지 크롤링 금지), 표기 문구 반영
- [ ] 11/2까지 허락이 불확실하면 위 "오픈 시점 대안" 결정

### 8.6 읽기 완료 연출

- `completeDay(dayNo)` → `{ status, day }`. `already` 면 연출 생략.
- Phase 1: `CompletionMoment` — 설정 파일의 완료 메시지(3장 "🌊 요단을 건넜습니다." 등) + 지도 마커 한 칸 이동 + 짧은 진동(지원 시). 과한 효과 없음.
- Phase 2: 3/6/18/24장 `mapEffect` 별 차등 연출.
- **[변경 2026-10-24]** 전체 화면 도착 화면(`components/reading/ArrivalScreen.tsx`): 이전 장소 → 이번 장소 길 그리기(내 아바타도 같은 시간·가속으로 길을 따라 걸어감, `components/map/MovingAvatar.tsx` — 움직임 줄이기면 바로 도착 위치) [추가 2026-10-26]. 지도 확대 영역은 출발·도착 지점이 함께 보이게(`cropAroundLeg` — 가까운 걸음은 기본 300×250, 먼 걸음은 비율을 지켜 넓힘). 도착 장면에는 깃발을 그리지 않고, 도착할 장소 아이콘은 처음부터 보이며 채움만 차오른다(되짚기도 같음). 카메라가 아바타를 따라가는 방식은 300px 높이에서 출발·도착이 모두 화면 밖으로 나가고 화면이 흔들려 택하지 않음, 3장은 가나안 점선이 사라지고 영역이 채워짐, 장별 도착 문구(`days.ts` completion), 다음 장 버튼. `completeDay` 가 `completed` 일 때만 띄운다(다시 읽기·이미 완료 시 없음). 오늘의 장이면 도착 순서도 보여 준다.

### 8.7 댓글 / 공감 — **[변경 2026-10-24] 오픈 포함으로 구현** (`reading_comment`, `reading_comment_like`, 마이그레이션 0002)

- 화면 이름은 "나눔". 본문 아래 + 나눔 탭(공개된 장들의 최근 나눔). 하루 20개 작성 제한, 1000자.
- 운영자 숨김/복구는 별도 `/admin` 없이 각 나눔의 "숨기기/복구" 버튼(운영자에게만 보임)으로 제공한다.

원래 설계:

- 위치: `/day/[day]` 본문 하단. **공개된 DAY에는 로그인(온보딩 완료)한 사용자 누구나 작성**(확정, 해당 장 완료 여부 무관). 종료 후에도 작성 가능.
- 정렬: **기본 최신순**, 탭으로 공감순. 최신순이 매일 나눔 흐름에 맞고 초기 댓글 독점을 막는다.
- 수정: 작성자 본인, "수정됨" 표시. 삭제: 작성자 soft delete(목록에서 제거).
- 관리자: 숨김/복구(`hidden_at`). 숨김 댓글은 작성자에게만 "운영자에 의해 숨겨진 나눔" 표시. **댓글을 배포할 때 관리자 숨김도 함께 배포**한다.
- 공감: 토글, `INSERT ... ON CONFLICT DO NOTHING` / `DELETE ... WHERE user_id = session`. 낙관적 UI.
- 실시간 갱신 없음(재진입 시 반영).

### 8.8 라우팅

| 경로 | 화면 | Phase |
|---|---|---|
| `/login` | 카카오 로그인 + 이관 안내 | 1 |
| `/onboarding` | 실명/셀 (명단 미매칭자만) | 1 |
| `/` (탭: 오늘) | 인사 + 'ㄹ'자 진행도(열린 장은 눌러 바로 본문, 아직 열리지 않은 장만 언제 열리는지 시트 — [변경 2026-10-26]). [변경 2026-10-30] 그새 더 읽었으면 아바타가 한 칸씩 걸어가며 길이 그려지고, 그날 처음 보면 걸은 길이 1장부터 그려진다(기기 쿠키 `gilgal_path` = 아바타 seed·이어 읽은 장·날짜, 서버가 첫 화면부터 걷기 전 모습으로 그림 — `lib/journey/pathMotion.ts`). 깃발은 펄럭인다. 숫자(읽은 장 수·셀 도착 수·도착한 사람 수·도착 화면 통계)는 0부터 올라가고, 셀 카드는 도착 비율 막대가 차오르며 도착한 셀원이 차례로 톡 떠오른다(`components/motion`). 탭을 오가면 간 방향에서 내용이 미끄러져 들어오고(`app/(tabs)/template.tsx`), 방금 남긴 나눔은 목록에 내려앉으며 옅게 물들고, 아바타를 저장하면 통 튀며 반짝인다. 홈 나눔 미리보기는 최근 나눔 40개 중 12개를 무작위로 골라 섞어(홈을 열 때마다 다른 사람이 먼저 — `lib/share/sample.ts`, 2026-11-01) 아바타 옆 말풍선으로 3개씩 보여 주고 11초마다 다음 3개가 옆에서 착착 들어오며, 하트로 바로 공감한다([변경 2026-11-01] ADR-029, 한마디 카드는 걷어 냄 — 위치는 목표 카드 바로 다음, 나눔 입력창에 "홈에서도 소개돼요" 안내. 말풍선을 누르면 `/day/N#share-<id>` 로 가서 그 나눔이 가운데로 오며 셀 카드와 같은 `flash-lift` 로 알린다) + 오늘 장에 도착한 사람 + 우리 셀. [변경 2026-11-01] 오늘 장에 도착한 사람·셀 카드 오른쪽 위에 "읽은 사람/전체 인원(온보딩 완료)" + 퍼센트 칩 (`ReadRatio`) | 1 |
| `/day/[day]` | [변경 2026-10-26] 장 머리(ACT·장) + 장 소개 카드(무대 지도 · 장소 · 제목 · 한 줄 요약 — 읽기 전 미리 보기, 장 소개는 이 한 곳에만) · 본문 · 읽기 설정(글자 크기·글꼴·굵기·줄 간격·배경) · 본문 끝 완료 버튼([변경 2026-10-26] 하단 고정 해제) · 나눔 · 도착 화면 | 1 |
| `/journey` (탭: 여정) | 지도/목록 전환. [변경 2026-10-26] 지도(화면 높이에 맞춰 제한, 가나안 주변만) → 아이콘 설명 한 줄 → 장 카드(되짚기 + 그 장소에서 있었던 일 + 같은 장소의 장 칩 + 읽기)를 모바일 한 화면에. [변경 2026-11-01] 지도를 키움(390×844 기준 높이 374→452px): 제목 아래 설명 줄·같은 장소 칩 줄을 빼고 읽기 버튼을 눈금 옆으로. 장을 바꾸면 내 아바타가 그 장의 장소로 걸어간다(다음 장은 진한 길을 따라, 이전 장은 되돌아감, 0.6초 — `JourneyMap` walker). "내 위치" 이름표는 실제 내 위치에서만. [변경 2026-11-01] 열린 장소·장까지만 보이고 고를 수 있다(ADR-030) | 1 |
| `/` 홈 나눔 미리보기 | [변경 2026-10-26] 깃발 장의 최근 나눔(없으면 여러 장 최근 나눔) → 장 본문 아래 나눔 / 모든 나눔. [변경 2026-11-01] 최근 12개를 말풍선으로 3개씩 넘김 + 홈에서 공감(ADR-029) | 1 |
| `/overview` (탭: 개관) | 여호수아 개관(표어·배경·네 부분·수 1:8) — 교회 제공 글, 내용은 `lib/journey/overview.ts` | 1 |
| `/share` (모든 나눔, [변경 2026-10-26] 하단 탭에서 제외) | 공개된 장들의 최근 나눔 | 1 |
| `/me` (탭: 나) | 나의 여정 숫자 · 나의 아바타 카드(→ 꾸미기) · 로그아웃 | 1 |
| `/me/avatar` (탭: 나) | 아바타 꾸미기(ADR-027). 홈 오른쪽 위 내 아바타·나 탭 아바타 카드에서 들어온다 | 1 |
| `/finale` | 24일 회고 (완주 전에는 남은 길 안내) | 1 |
| ~~`/community`~~ | 홈 카드로 대체 | — |
| ~~`/admin`~~ | 나눔의 숨기기/복구 버튼으로 대체 | — |

---

## 9. DB 스키마 (길갈 Supabase, `public` 스키마)

독립 DB이므로 길갈이 `public` 스키마 전체를 소유한다. 캠페인/일자 데이터는 설정 파일(ADR-003). 아래는 설계 표현이며 실제 정의는 drizzle로 하고 `generate` 결과 SQL을 리뷰 후 적용한다.

### 9.1 Auth.js 테이블

`user`, `account`, `session`, `verificationToken` — `@auth/drizzle-adapter` 표준 정의 그대로. 커스텀 컬럼을 넣지 않는다(ADR-014).
`account (provider, providerAccountId)` PK 가 카카오 회원번호의 유일성을 보장한다.

### 9.2 서비스 테이블

```sql
-- 셀 (Selah와 달리 정규화)
CREATE TABLE cell (
  id         serial PRIMARY KEY,
  name       text NOT NULL UNIQUE,         -- "정윤경셀"
  sort_order int  NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 이관 명단 (Selah 회원/명단 + 운영자 수동 명단)
CREATE TABLE roster_entry (
  id          serial PRIMARY KEY,
  kakao_id    text UNIQUE,                 -- NULL 허용(미가입자). 실명 매칭 시 백필
  real_name   text NOT NULL,
  cell_id     int  NOT NULL REFERENCES cell(id),
  source      text NOT NULL CHECK (source IN ('selah_member','selah_roster','manual','admin')),
  claimed_by  text UNIQUE REFERENCES "user"(id) ON DELETE SET NULL,
  claimed_at  timestamptz,
  claim_method text CHECK (claim_method IN ('kakao_id','real_name')),
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (real_name, cell_id)
);

-- 길갈 사용자 프로필 (1:1 user)
CREATE TABLE profile (
  user_id           text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  kakao_id          text NOT NULL UNIQUE,  -- account 에서 복사, 매칭/운영용 (클라이언트 비노출)
  real_name         text,
  cell_id           int REFERENCES cell(id) ON DELETE SET NULL,
  onboarding_status text NOT NULL DEFAULT 'pending'
                    CHECK (onboarding_status IN ('pending','matched','manual')),
  name_match_attempts smallint NOT NULL DEFAULT 0,  -- 실명 매칭 시도 횟수 제한 (5.4)
  is_admin          boolean NOT NULL DEFAULT false,
  is_test           boolean NOT NULL DEFAULT false, -- 개발·테스트 계정: 통계·목록에서 제외 (9.3)
  avatar_style      text  NOT NULL DEFAULT 'marbles',
  avatar_seed       text  NOT NULL UNIQUE,
  avatar_options    jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON profile (cell_id);

-- 읽기 완료
CREATE TABLE reading_progress (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign     text     NOT NULL,
  day_no       smallint NOT NULL CHECK (day_no BETWEEN 1 AND 24),
  user_id      text     NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign, day_no)
);
CREATE INDEX ON reading_progress (campaign, day_no);
CREATE INDEX ON reading_progress (campaign, completed_at);

-- 나눔 (drizzle/0002_comments.sql, 2026-10-24 적용) — 실제 이름은 reading_comment / reading_comment_like,
-- id 는 bigint identity, edited_at(수정됨 표시) 추가, 내용 CHECK 는 btrim 후 1~1000자
CREATE TABLE comment (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign   text     NOT NULL,
  day_no     smallint NOT NULL CHECK (day_no BETWEEN 1 AND 24),
  user_id    text     NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  content    text     NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  deleted_at timestamptz,
  hidden_at  timestamptz,
  hidden_by  text REFERENCES "user"(id) ON DELETE SET NULL
);
CREATE INDEX ON comment (campaign, day_no, created_at DESC);

CREATE TABLE comment_reaction (
  comment_id uuid NOT NULL REFERENCES comment(id) ON DELETE CASCADE,
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

-- 모든 테이블(Auth.js 포함): ENABLE ROW LEVEL SECURITY (정책 없음), anon/authenticated 권한 REVOKE
```

- [추가 2026-11-03] 방문 기록(ADR-036, `drizzle/0007_daily_visit.sql`):
  `daily_visit(campaign, visit_date date, user_id → user ON DELETE CASCADE, first_at)`, PK(campaign, visit_date, user_id), INDEX(user_id).
  온보딩을 마친 사용자가 화면을 열면 하루(서비스 날짜) 한 번. 무엇을 봤는지는 남기지 않는다. RLS 켬·정책 없음.
- [추가 2026-11-03] 형광펜(ADR-035, `drizzle/0006_verse_highlight.sql`):
  `verse_highlight(user_id → user ON DELETE CASCADE, chapter 1~24, verse 1~200, created_at)`, PK(user_id, chapter, verse).
  캠페인과 무관(그 사람의 여호수아에 남는다), 본문 글자는 저장하지 않는다. RLS 켬·정책 없음, anon/authenticated 권한 없음(0001 기본 권한).
- [추가 2026-10-29] 앞서 간 동행자의 한마디(ADR-028, `drizzle/0003_trail_note.sql`) — [변경 2026-11-01] 화면은 걷어 냈고(ADR-029) 테이블·데이터만 남아 있다:
  `trail_note(id bigint identity, campaign, day_no 1~24, user_id → user, content 1~40자(btrim), created_at, updated_at, hidden_at, hidden_by)`,
  UNIQUE(campaign, day_no, user_id) — 장마다 한 사람 하나(고치면 덮어씀). RLS 켬·정책 없음, anon/authenticated 권한 없음(0001 기본 권한).
- 온보딩 완료 = `real_name IS NOT NULL AND cell_id IS NOT NULL` (status는 `matched`/`manual`).
- 성경 본문 테이블(`bible_verse`)은 이용 허락 후 `db` provider를 택할 때 별도 마이그레이션.
- 신고 기능 확장 시 `comment_report(comment_id, user_id, reason, created_at, PK(comment_id,user_id))`.

### 9.3 개발/테스트 데이터 격리 (단일 프로젝트, 확정)

개발·초기 테스트도 운영과 같은 길갈 Supabase 프로젝트를 사용한다(ADR-015). 대신:

- **테스트 데이터 구분**
  - 읽기 기록·댓글: 로컬/Preview는 `GILGAL_CAMPAIGN=joshua-2026-test`, 운영은 `joshua-2026`. 화면·통계는 현재 캠페인 slug만 조회하므로 섞이지 않는다.
  - 테스트 계정: `profile.is_test = true`(운영자가 지정) → 참여자 수·아바타 목록·셀 통계에서 제외.
  - 이관 데이터는 실제 데이터이므로 테스트 중 수정·삭제하지 않는다.
- **승인 원칙**: 마이그레이션 SQL은 적용 전 검토·승인. 운영 데이터에 영향을 줄 수 있는 테스트·삭제(테스트 slug 정리 포함)는 대상 행 수를 먼저 보여주고 승인 후 실행.
- **분리 용이성**: 연결은 `DATABASE_URL`/`DIRECT_URL` 로만 결정, 마이그레이션은 저장소의 버전 관리 파일 → 나중에 개발 DB를 만들면 env만 바꾸고 같은 마이그레이션을 적용하면 된다.
- `drizzle-kit push` 금지, `generate` + `migrate` 만.

---

## 10. 설계 결정 기록 (ADR)

### ADR-001 Selah 운영 DB 공유 — **대체됨(ADR-011)**
- 원결정: 길갈이 Selah Supabase DB를 함께 사용. 2026-10-19 사용자 검토로 취소.

### ADR-002 `gilgal` Postgres 스키마 분리, Selah 테이블 DDL 금지 — **대체됨(ADR-011)**
- 독립 DB 사용으로 별도 스키마가 불필요해졌다. "Selah DB에 DDL/DML 금지" 원칙은 ADR-011에서 더 강하게(접속 자체 금지) 유지.

### ADR-003 캠페인/일자 데이터는 설정 파일(코드)로 관리 — 채택(유지)
- **배경**: 테이블 최소화, 데이터 한 곳 관리, 초기 config 허용. 운영자 1인, 24일 단일 캠페인.
- **결정**: `reading_campaign`/`reading_day` 테이블 없이 `lib/journey/*` 를 단일 원천으로. DB는 `campaign` slug + `day_no` 로 참조.
- **대안**: DB 테이블 + 시드 — 무배포 수정 가능하나 이중 관리·타입 안정성 손실.
- **결과**: 타입 안전·테스트 용이. 수정에 배포 필요. 다회 캠페인/관리 UI가 필요하면 테이블로 승격.

### ADR-004 셀은 Selah `user.cellName` 사용 + public 쓰기 — **대체됨(ADR-013)**

### ADR-005 아바타 정보를 `gilgal.member` 에 저장 — **대체됨(ADR-014)**
- 독립 DB에서는 `profile` 테이블에 아바타 필드를 둔다.

### ADR-006 RLS 대신 서버 계층 권한 + 직접 접근 차단 — 채택(독립 DB 기준으로 개정)
- Supabase Auth 미사용으로 `auth.uid()` 정책 불가. 서버 계층에서 권한 강제, DB는 Data API 비활성화 + 모든 테이블 RLS(정책 없음) + anon/authenticated REVOKE.

### ADR-007 DiceBear를 서버에서 생성해 자체 엔드포인트로 제공 — 채택(유지, ADR-018 철회)
- 대안 `api.dicebear.com` 직접 사용은 외부 가용성 의존·seed 제3자 전송.
- 구현: DiceBear v10 — `@dicebear/core` + `@dicebear/styles/marbles.json`(CC0 1.0). v9 `@dicebear/collection` 에는 marbles 가 없고 v10부터 `@dicebear/styles` 로 제공된다.

### ADR-008 성경 본문 Provider 추상화 — 채택 (운영 link 모드 부분은 **대체됨(ADR-016)**)
- 원결정: 개역개정 목표, 허락 전 운영은 `link`(대한성서공회 장 링크), 개발은 `mock`, 허락 후 `static`/`db`.
- Provider 추상화와 "허락 전 수집·저장·표시 금지" 원칙은 유지. 운영 기본값 `link` 는 ADR-016으로 대체.

### ADR-009 시간은 KST 단일 함수, 개발 환경에서만 오버라이드 — 채택(유지)

### ADR-010 인앱 브라우저는 강제 이탈하지 않음 — 제안(유지)
- Selah의 강제 전환은 STT 때문. 길갈은 읽기/버튼 위주라 카카오톡 인앱 그대로 사용. 카카오 로그인 문제 시에만 안내. 실기기 검증 필요.

### ADR-011 길갈 전용 Supabase 프로젝트 — 채택
- **결정**: 길갈은 신규 Supabase 프로젝트(DB 인스턴스·Auth.js 테이블·세션·서비스 데이터 독립). Selah DB에 런타임 접속하지 않으며, Selah 접속 정보를 길갈에 두지 않는다.
- **배경**: 운영 사고 격리, Selah 스키마 운영(`db:push`)과의 간섭 제거, 권한·백업·수명 독립 관리.
- **대안**: 공유 DB + 별도 스키마(ADR-001/002) — 즉시 재사용 가능하나 Selah 운영 DB에 결합.
- **결과**: 사용자·셀 재사용은 카카오 회원번호 매핑 + 1회 이관으로 해결(ADR-012, 013). 이관 이후 두 서비스의 셀 정보는 독립적으로 변할 수 있다.

### ADR-012 같은 카카오 OAuth 앱 사용, 회원번호로 사람 식별 — 채택
- **배경**: 카카오 회원번호는 앱 단위로 발급되므로, 같은 앱이어야 Selah 회원과 같은 값을 받는다. DB가 달라 내부 `user.id` 는 다르다.
- **결정**: Selah와 같은 카카오 앱의 키를 사용하고 길갈 도메인/Redirect URI만 추가. 매핑 키는 `account.providerAccountId`(= `profile.kakao_id`).
- **대안**: 길갈 전용 카카오 앱 — 앱 설정 독립성은 좋지만 Selah 회원 자동 연결 불가(전원 재온보딩).
- **결과**: 카카오 앱 설정이 두 서비스에 공유됨. 앱 키 재발급·동의항목 변경 시 양쪽 영향 → 콘솔 변경은 "추가"만.

### ADR-013 Selah 셀 정보는 오픈 전 1회 최소 이관, 동기화 없음 — 채택 (2026-10-19 v3 보강)
- v3 보강: 셀 편성 기준은 Selah 셀 목록·명단 그대로(최신 여부 미확인, 확정). 이관 후 수정은 운영자가 Supabase에서 직접. 온보딩은 Selah 3단계 방식 재사용하되 "미배정" 선택지 없음, 수동 선택 결과는 명단에 백필하지 않음(5.3, 5.4).
- **결정**: 운영자가 Selah SQL Editor에서 읽기 전용 SELECT → CSV(카카오 ID, 실명, 셀) → 길갈 import 스크립트로 `cell`/`roster_entry` 적재 → CSV 삭제. 이후 셀 원본은 길갈.
- **대안**: ③ 지속 동기화 — Selah 실시간 의존·비밀정보 공유·충돌 처리 부담. 사용자 요청(복잡한 동기화 회피)과도 상충.
- **결과**: 단순·안전. 오픈 전 셀 편성 변경은 스크립트 재실행(멱등)으로, 오픈 후 변경은 길갈 관리자 수정으로 반영.

### ADR-014 Auth.js 테이블은 표준 유지, 서비스 정보는 `profile` 로 분리 — 채택
- **배경**: Selah는 `user` 에 커스텀 컬럼을 두어 세션 콜백에서 추가 조회를 피했다. 독립 DB에서는 자유롭게 설계 가능.
- **결정**: `user` 는 어댑터 표준 그대로, 실명·셀·관리자·아바타는 `profile`. 요청당 1회 `getViewer()`(React cache)로 조회.
- **대안**: Selah식 `user` 커스텀 컬럼 — 요청당 쿼리 1회 절약.
- **결과**: 어댑터 업그레이드 영향 최소, 프로필 확장 용이. 서울 리전 내 추가 쿼리 1회 비용은 수용.

### ADR-015 Supabase 프로젝트 하나로 개발·운영 — 채택
- **결정**: `gilgal-dev` 를 만들지 않고 길갈 프로젝트 하나를 개발·초기 테스트·운영에 사용한다.
- **배경**: 오픈까지 2주, 소규모 운영. 무료 플랜 프로젝트 수 제약.
- **대안**: 별도 개발 DB — 격리는 가장 좋지만 지금은 관리 부담 대비 이득이 작다.
- **결과**: 테스트 데이터는 캠페인 slug(`joshua-2026-test`)와 `profile.is_test` 로 구분. 마이그레이션 SQL·운영 데이터 영향 작업은 승인 후 실행. 연결은 env 두 개로만 결정해 추후 분리가 쉽다.

### ADR-016 성경 본문은 서비스 내부에서 표시 — 채택
- **결정**: 외부 링크 중심 방식을 버리고, 여호수아 1~24장을 길갈 안에서 장·절 구분해 표시한다. 읽기→완료→댓글이 한 화면에서 이어진다. Provider는 `mock`(허락 전) / `static` / `db`(허락 후).
- **배경**: 외부 이동 없이 읽기부터 완료까지 진행하는 경험이 핵심(사용자 확정).
- **대안**: `link` 모드 운영(ADR-008 원안) — 허락 없이 가능하지만 이탈·복귀 UX가 나쁘다. 오픈 시점에 허락이 없을 때의 비상 대안으로만 남김.
- **결과**: 대한성서공회 이용 허락이 서비스 내 본문 제공의 전제 조건이 된다. 허락 일정이 오픈 일정의 리스크(8.5 "오픈 시점에 허락이 없을 경우").

### ADR-017 Vercel 기본 도메인 사용 — 채택
- **결정**: 커스텀 도메인 없이 Vercel이 할당하는 `*.vercel.app` 주소(예상 `project-gilgal.vercel.app`)를 사용한다. 카카오 Redirect URI는 실제 할당 주소로 추가.
- **결과**: 비용 없음. 주소가 바뀌면 카카오 콘솔 URI도 함께 추가해야 한다. Preview URL은 카카오 로그인 대상에서 제외.

### ADR-018 Marble 아바타를 자체 생성 — **철회** (2026-10-19, ADR-007 유지)
- 철회 사유: DiceBear v10의 `@dicebear/styles` 에 `marbles` 가 있음을 확인(v9 컬렉션만 보고 잘못 판단). 자체 생성 코드를 지우고 DiceBear로 교체했다. 아래는 당시 기록.
- **배경**: 구현 단계에서 확인해 보니 DiceBear 컬렉션(9.x)에는 `marbles` 스타일이 없다. "흐릿하게 섞인 색 덩어리 원형"은 Boring Avatars의 `marble` 변형이다.
- **결정**: 의존성 없이 `lib/avatar.ts` 에서 seed → 결정적 marble SVG를 만든다(FNV-1a 해시 + mulberry32, 길갈 팔레트 6종). 제공 방식은 그대로 `/api/avatar/[seed]` + 영구 캐시. `profile.avatar_style='marbles'` 값 유지.
- **대안**: ① Boring Avatars(React 컴포넌트)를 서버에서 문자열로 렌더 — 같은 모양이지만 색이 무작위 팔레트라 톤 통일이 어렵다. ② DiceBear `glass`/`shapes` — 요구한 느낌과 다르다.
- **결과**: 외부 의존성 0, 길갈 톤과 일관. 생성 알고리즘을 바꾸면 모든 사용자의 아바타가 바뀌므로, 바꿀 때는 새 `avatar_style` 값을 추가한다.

### ADR-019 본문 Provider는 `mock`/`db` 두 가지, 본문은 운영자가 제공 — 채택 (2026-10-19)
- **결정**: `static`(JSON 파일)은 만들지 않고 `bible_verse` 테이블(`db`)만 둔다. 본문은 운영자가 텍스트 파일로 제공하고 `pnpm bible:load` 가 파싱·검증(24장·장별 절 수)한 뒤 적재한다. 저장소에는 번역문을 두지 않는다. 길갈(Claude 포함)은 웹에서 개역개정 본문을 수집하지 않는다.
- **배경**: 운영자가 "소규모 비공개 서비스이니 본문을 넣어 달라"고 요청. 개역개정은 저작권 보호 대상이므로 수집·저장의 책임 주체가 운영자여야 하고, 저장소 공개 여부와 무관하게 커밋하지 않는 편이 안전하다.
- **대안**: `static` JSON 동봉 — 배포에 본문이 포함되어 저장소·빌드 산출물에 복제가 남는다.
- **결과**: 본문 교체는 파일 적재 + `BIBLE_PROVIDER=db` 만으로 끝난다. 적재 전 `db` 로 두면 화면은 "본문 준비 중"을 보인다.
- **2026-10-19 적재**: 운영자가 개역개정 여호수아 1~24장 텍스트를 제공(소규모 비공개 서비스, 운영자 판단) → `bible_verse` 658행, 소제목 49개, 각주 표시(`1)` 등) 제거. 원본 파일은 `data/private/joshua-gae.txt`(gitignore). 대한성서공회 이용 허락 문의 TODO(8.5)는 운영자 판단으로 유지.

### ADR-020 아바타 섞기 — 채택 (2026-10-20)
- **결정**: `/journey` 의 "나의 아바타"에서 섞기 → 미리보기 → "이걸로 할게요"로 `profile.avatar_seed` 를 바꾼다. 후보 seed(9바이트 랜덤 base64url 12자, `lib/avatarSeed.ts`)는 브라우저에서 만들고, 서버 액션 `saveAvatarAction(seed)` 가 형식을 다시 검사한 뒤 세션 userId 의 행만 UPDATE 한다.
- **배경**: 운영자 요청 — 자동 생성된 모양이 마음에 들지 않으면 바꿀 수 있게. 스키마 변경 없이 기존 `avatar_seed` 만 교체한다.
- **대안**: 서버가 seed 를 만들어 즉시 저장 — 마음에 드는 모양을 지나치면 되돌릴 수 없고, 섞을 때마다 DB 쓰기가 생긴다.
- **결과**: 섞기 횟수 제한 없음(미리보기는 DB 를 건드리지 않음). 다른 사람의 seed(이미지 주소로 보임)를 보내도 `avatar_seed` unique 제약으로 `taken` — 같은 모양 사칭 불가. 이전 seed 의 이미지 캐시는 주소가 달라 영향 없음.

### ADR-021 디자인 시안 v5 적용: 남색 톤 고정, 표기명 "에벤" — 채택 (2026-10-24), 표기명 부분은 대체됨(ADR-025)
- **결정**: 시안의 `[data-tone="navy"]` 변수를 Tailwind `@theme` 토큰(bg/surface/line/soft/mid/mute/main/main-2/text/sea/water)으로 옮기고, 모서리·글자 크기도 토큰화했다. 글꼴은 고운바탕(next/font/google, 제목·본문)과 Pretendard(npm `pretendard` 동적 서브셋 CSS, 자체 호스팅). 표기명은 `BRAND.name = "에벤"`. 아바타는 DiceBear marbles 의 색 옵션(sphere/blend/tint/ink/background)을 남색 계열 팔레트로 고정하고 원형으로 내보낸다. 이미지 주소에 `?v=navy1` 을 붙여 영구 캐시된 이전 그림을 갈아 끼운다.
- **배경**: 운영자가 시안 v5 를 시각·인터랙션 기준으로 제시. 톤 전환·폰 프레임·데모 데이터·가짜 marble 함수는 가져오지 않는다.
- **대안**: 기존 베이지·올리브 톤 유지 — 시안과 어긋남. 톤 전환 제공 — 운영자가 하나로 고정하기로 함.
- **결과**: 색을 컴포넌트에 직접 쓰지 않는다(카카오 로그인 버튼의 브랜드 노랑만 예외). 아바타 팔레트를 바꾸면 `AVATAR_RENDER_VERSION` 도 올린다.

### ADR-022 내 위치·깃발·도착 순서 규칙 — 채택 (2026-10-24, 운영자 확정)
- **결정**: 내 위치 = 1장부터 이어서 읽은 마지막 장(`contiguousPosition`). 깃발 = 오늘의 장(주일은 가장 최근에 열린 장, 기간 전·보충 기간·종료 후 없음, `flagDay`). "깃발까지 N장" = 공개된 장 중 안 읽은 장 수. 도착 순서 = 그 장의 `completed_at` 순(동시각은 id 순). 완료 시각은 `nowKst()` 로 넣어 개발용 `GILGAL_DEV_NOW` 시나리오에서도 순서가 맞다.
- **배경**: 시안 v5 의 'ㄹ'자 진행도와 "오늘 N장까지 읽은 사람". 기존 8.2 의 "가장 멀리 간 장" 규칙을 대체한다.
- **대안**: 가장 멀리 간 장 — 건너뛰고 읽으면 아바타가 앞서가 "아직 걷지 않은 길"이 가려진다.
- **결과**: 순위는 핵심 3(경쟁 아님)과 긴장이 있으나 운영자 확정. 완료하지 않은 사람의 명단은 만들지 않는다. ~~셀 카드의 아직인 셀원은 이름 없이 보낸다.~~ [변경 2026-10-26] 셀 카드는 같은 셀 안에서 아직인 셀원 이름도 보인다(운영자 요청).

### ADR-023 지나온 길은 옅게, 한 구간만 진하게 + 여정 되짚기 — 채택 (2026-10-24)
- **결정**: 지도의 지나온 길은 모두 옅은 선(투명도 0.22)으로 그리고, 진하게는 한 구간만 그린다(기본은 가장 최근 구간, 여정 탭에서는 고른 장의 구간). 지나온 장소는 테두리 아이콘, 내 위치·고른 장의 장소만 채운 아이콘. 여정 탭 지도 아래에 "여정 되짚기"(◀ ▶, 24칸 눈금을 끌거나 키보드 ←→)를 두고, 고른 장의 구간을 다시 그리며 장소 카드·장 목록과 연동한다(장소·장 목록을 눌러도 같은 장으로 옮겨 감).
- **배경**: 운영자 피드백 — 17장쯤 되면 진한 선이 겹쳐 산만함. 지나온 길을 직접 넘겨 보고 싶음.
- **대안**: 최근 몇 구간만 진하게 — 여전히 겹침. 자동 재생 — 조작감이 없고 움직임이 많다(reduced-motion 부담).
- **결과**: 전체 경로는 옅게 남아 흐름은 보이고, 한 번에 한 걸음만 읽힌다. 장소 카드의 장 행은 이제 본문 링크가 아니라 장 선택이며, 읽기는 되짚기 카드의 "N장 읽기" 버튼으로 간다.

- **[추가 2026-10-26]** 아직 걷지 않은 길(내 위치~깃발) 점선과 그 장소의 점선 테두리를 없앴다 — 지나온 길의 옅은 선과 겹쳐 산만했다(운영자 피드백). 강조가 옮겨 갈 때 바로 전 장소의 채운 아이콘(되짚기에서는 선택 테두리도)을 위에 겹쳐 두고, 도착할 때 가운데에서 차오르는 연출(`map-pop`)의 반대로 살짝 부풀었다가 가운데로 오므라들며 사라지게 한다(`map-unpop`, 도착 화면 0.5초·되짚기 0.4초 — 머물다 떠나는 느낌. 선택 테두리는 흐려짐). 아직 열리지 않은 장을 되짚기로 고르면 그 구간만 점선으로 보인다. 내 위치 장소는 칠하지 않는다(아바타가 보여 주므로 — 되짚기 중 강조가 둘로 보이지 않게). 아바타 위(아이콘 아래에 둔 장소는 아래)에 "내 위치", 깃발 위에 "오늘 N장"(주일 "N장까지 열림", `flagCaption`) 이름표를 달고, 둘이 같은 장소면 깃발 이름표 하나("내 위치 · 오늘 N장")로 합친다. 이름표 자리 때문에 싯딤·길갈·실로 지명과 여리고·실로·세겜 아바타 위치를 옮겼다.
- **[추가 2026-10-26]** 여정 탭을 한 화면 구성으로 바꿨다 — 세로로 길어 지도 아래 되짚기·장소 카드가 첫 화면 밖이었다(운영자 피드백). 목적은 "장 순서대로 넘기며 그 장의 장소와 거기서 하나님이 하신 일을 본다". 지도는 `EXPLORER_CROP`(가나안 주변)을 meet 로, 높이 `clamp(220px, 100dvh − 505px, 400px)`. 되짚기와 장소 카드를 장 카드 하나로 합치고, 같은 장소의 다른 장은 칩으로 줄였다. 375×667(SE)에서는 읽기 버튼 아래쪽이 탭에 조금 걸린다. 이어서 아이콘 설명 줄을 빼고(장 카드의 아이콘 + 장소 이름이 대신) 지도를 키웠다(`clamp(240px, 100dvh − 470px, 440px)`). 장 카드·도착 화면의 설명은 장소 설명 대신 장별 한 줄(`days.ts` SUMMARIES, 초안·교회 검토 대상)을 쓴다.
### ADR-024 오픈 전 운영 테스트 모드 — 채택 (2026-10-24)
- **결정**: `GILGAL_PRELAUNCH_TEST=1` 이면 운영(VERCEL_ENV=production)에서도 `GILGAL_DEV_NOW` 를 적용하고, 공동체 숫자·도착 순서·셀 카드에 테스트 계정(`is_test`)을 함께 센다. 첫 장 공개 시각(2026-11-02 00:00 KST, `PRELAUNCH_UNTIL`)이 지나면 환경변수가 남아 있어도 저절로 꺼진다. 날짜를 바꿔 보는 동안 모든 화면 위에 "테스트 모드 · N월 N일로 보는 중" 띠를 보인다. `GILGAL_DEV_NOW` 는 날짜만 주면 시각은 실제 시각을 써 여러 사람의 완료 시각·순서가 실제처럼 흐른다.
- **배경**: 운영자가 오픈 전 운영 주소에서 직접 온보딩·특정 날짜 읽기·셀 화면을 확인하고 싶어 함. 기존에는 운영에서 날짜 오버라이드가 막혀 있어 Preview 브랜치·카카오 Redirect URI 추가가 필요했다.
- **대안**: test 브랜치 Preview 배포 — 정석이지만 고정 브랜치 주소와 카카오 URI 추가가 필요. 운영에서 오버라이드를 상시 허용 — 오픈 후 날짜가 고정되는 사고 위험.
- **결과**: 오픈 전 테스트 기록은 운영 캠페인(`joshua-2026`)에 쌓이므로 오픈 전에 `reading_progress`·`reading_comment` 를 정리한다(운영자). 자동 종료 덕분에 환경변수를 지우는 것을 잊어도 오픈 후에는 실제 날짜·실제 사용자만 쓴다(그래도 지우는 것을 권장).

---

## 11. 확인이 필요한 사항

확정됨(2026-10-19): 참여자 분모 = 길갈 온보딩 완료자 / 표시명 = 실명 / 공개된 장에 로그인 사용자 누구나 댓글 / 셀 편성 = Selah 기준 그대로 / 개발 DB 없음(단일 프로젝트) / Vercel 기본 도메인 / 12/6 이후 종료일 없음.

남은 사항:

1. ~~Selah 데이터 이관 방식 승인~~ — 완료(2026-10-19): CSV 2개 제공 → 셀 26개·명단 229행 적재, CSV 삭제. 충돌 1건(같은 사람이 같은 셀에 카카오 계정 2개, 명단에 있는 계정만 적재) — 다른 계정으로 로그인하면 온보딩을 거친다.
2. **본문 이용 허락**: 대한성서공회 문의 시점, 그리고 11/2까지 허락이 없을 때의 대안(8.5: 임시 링크 vs 오픈 연기).
3. **미가입자 명단 정리 시점**: claim 안 된 명단 행 삭제 시점(예: 2027-01-31).
4. **Supabase 플랜**: 종료일 없는 운영을 감안한 일시 중지·백업 정책 확인.

### ADR-025 표기명 "여호수아 읽기 : 거룩한 하나님 백성으로 살기" — 채택 (2026-10-26)
- **결정**: `BRAND.name = "여호수아 읽기"`, `BRAND.subtitle = "거룩한 하나님 백성으로 살기"`. 브라우저 제목은 "이름: 부제". 로그인 화면 위 작은 글씨는 캠페인 제목 대신 `BRAND.kicker`("함께 걷는 24일 통독") — 이름과 "여호수아"가 겹치지 않게.
- **배경**: 운영자 요청 — 평범하지만 무엇을 하는 서비스인지 바로 알 수 있는 이름과, 청년캠프1 표어(성결)를 담은 부제.
- **대안**: "에벤" 유지 — 뜻을 따로 설명해야 한다.
- **결과**: ADR-021 의 표기명 부분을 대체한다. 저장소·DB·도메인 이름은 gilgal 그대로.

### ADR-026 본문 읽기 설정은 쿠키에 — 채택 (2026-10-26)
- **결정**: 본문 화면에 전자책 뷰어식 읽기 설정(글자 크기 5단계·글꼴 바탕/고딕·굵기·줄 간격·배경 기본/종이/어둡게)을 둔다. 값은 `reader` 쿠키(1년, `lib/reading/settings.ts`)에 저장하고, 서버가 쿠키를 읽어 본문 화면을 감싼 `#reader-root` 에 `data-reader-theme` 와 CSS 변수를 달아 첫 화면부터 그 설정으로 그린다. 배경은 그 요소 안에서 색 토큰을 덮어써 카드·버튼·지도까지 따라온다(`globals.css`). 이전 `localStorage` 글자 크기(FontSizeButton)는 대체.
- **배경**: 운영자 요청 — 글자 크기 외에 굵게·배경색 등 기본 기능, 사용자별로 유지.
- **대안**: DB(profile) 저장 — 기기를 바꿔도 따라오지만 마이그레이션·서버 액션이 필요하고, 휴대폰마다 화면·환경이 달라 기기별 설정이 오히려 자연스럽다. localStorage — 서버가 읽지 못해 열 때 기본값으로 번쩍인다.
- **결과**: 다른 기기·브라우저에서는 다시 설정해야 한다. 쿠키가 모든 요청에 실려 가지만 100바이트 남짓이다. 이전 글자 크기 설정은 이어받지 않는다(기본 17.5).

### ADR-027 아바타 꾸미기 — Marbles 부품 고르기 + 길갈 부품 — 채택 (2026-10-29)
- **결정**: 아바타 스타일은 Marbles 그대로 두고, 그 안의 부품(머리·모자 20, 눈 9, 입 11, 코 2)과 구슬 색 6을 사용자가 직접 고르게 한다. Marbles 에 없는 안경 4종·얼굴 특징 5종([변경 2026-11-01] 안경 3종·얼굴 2종으로 줄임)은 정의를 복사해 같은 선 굵기·잉크색으로 그려 붙인다. 고른 값은 기존 `profile.avatar_options`(jsonb) 에 저장 — 스키마 변경 없음. 이미지 주소는 부품을 담은 아바타 키(`/api/avatar/seed~…`)라 DB 조회 없이 영구 캐시를 유지한다. ADR-020(섞기)을 확장한다.
- **배경**: 운영자 요청 — 섞기만으로는 자기와 닮게 꾸미기 어렵다. 기존 스타일은 해치지 않기.
- **대안**: 사람형 스타일(notionists·micah·avataaars) — 피부색·헤어를 더 닮게 할 수 있지만 남색 구슬 톤과 지도·카드의 인상이 모두 바뀐다. 이미지 주소를 seed 그대로 두고 서버가 DB 에서 부품을 읽기 — 영구 캐시가 깨지고 아바타 하나마다 조회가 생긴다.
- **결과**: 피부색·얼굴형은 표현하지 않는다(특징을 골라 "그 사람다움"을 드러내는 수준). 키에 부품이 드러나지만 seed 와 마찬가지로 이름과 연결되지 않는다. 부품 id·순서를 바꾸면 저장된 키가 깨지므로 뒤에 추가만 한다. 추후 포인트·여정 이정표로 여는 장식 부품은 `avatar_unlock`·`point_ledger` 테이블을 더해 확장한다(닮게 꾸미는 기본 부품은 계속 무료).

### ADR-028 앞서 간 동행자의 한마디 — 이름 없는 아바타 말풍선 — 대체됨(ADR-029) (2026-10-29)
- **결정**: 장을 읽고 도착한 사람이 "뒤에 올 동행자에게" 한 줄(40자)을 남긴다. 그 자리에 있던 백성이 되어 쓰도록 안내한다. 도착 화면에서 쓰고(본문을 다시 볼 필요 없는 한 줄이라), 홈에서는 내가 **다음에 읽을 장**에 먼저 도착한 사람들의 한마디가 아바타 옆 말풍선으로 세 사람씩 보이고, 5초마다 다음 세 사람이 옆에서 한 줄씩 들어온다(말풍선은 한 박자 늦게 톡). 손으로 좌우로 밀어 넘기고, 누르는 동안·화면 밖·동작 줄이기면 저절로 넘기지 않는다. [변경 2026-10-30] 처음엔 가로로 흐르는 띠(마퀴)였으나 움직이는 글은 읽기 어렵고 정적으로 느껴져 묶음 넘김으로 바꿨다. 다 따라온 사람에게는 지금 있는 장에 함께 도착한 사람들의 말풍선과 "나도 한마디"를 보여 준다. 화면에는 **이름 없이** 아바타 키와 내용만 보낸다. 새 테이블 `trail_note`(나눔과 성격이 달라 분리), 운영자 숨김·작성자 고치기/지우기.
- **배경**: 운영자 제안 — 먼저 간 사람이 아직 오지 않은 사람에게 말을 건네면, 진척도의 부담이 환영과 격려로 바뀐다. 이름을 빼야 부끄럽지 않게 이입할 수 있다.
- **대안**: 나눔 테이블에 종류 컬럼 추가 — 길이·공개 방식·화면이 달라 섞이면 헷갈린다. 세로 목록 — 홈이 길어지고 나눔 목록과 비슷해진다. 이름 표시 — 이입이 어렵다.
- **결과**: 이름이 없어 장난스러운 글이 생길 수 있어 운영자 숨김으로 대응한다(아바타는 보여 완전 익명은 아님). 쓰려면 그 장을 완료해야 한다(서버 확인). 여정 탭 지도의 "이곳에 남겨진 한마디"는 다음 단계.

### ADR-029 한마디를 거두고, 말풍선 넘김은 홈 나눔에 — 채택 (2026-11-01)
- **결정**: 한마디(ADR-028)의 쓰기·보기 화면을 모두 걷어 낸다(도착 화면 입력, 홈 카드, 서버 액션·조회). 홈 나눔 미리보기를 한마디 카드의 넘김 방식으로 바꾼다 — 최근 나눔 12개를 아바타 옆 말풍선(이름·시각, 세 줄까지)으로 세 개씩 보여 주고, 11초마다 다음 세 개가 옆에서 한 줄씩 들어온다. 좌우로 밀어 넘기기, 누르는 동안·화면 밖·동작 줄이기면 멈춤은 그대로. 말풍선 옆 하트로 홈에서 바로 공감한다(`components/home/ShareCarousel.tsx`). 하루 전에 만든 한 칸씩 흐르는 세로 목록(ShareFeed)은 이것으로 대체.
- **배경**: 캠프장 의견 — 한마디는 비슷한 말("화이팅")만 반복되기 쉽고, "그 자리의 백성이 되어 쓰라"는 안내를 캠프원에게 이해시키기 어렵다. 운영자도 공감. 다만 홈에 서로 반응하는 실시간 느낌은 필요하고, 넘김 연출은 살리고 싶다.
- **대안**: 나눔에 붙은 구절("동행자들이 붙든 말씀")을 말풍선으로 — 운영자가 끌리지 않음, 구절을 붙인 나눔이 적으면 빈 카드. 실시간 소식("○○님이 방금 8장을 걸었어요") — 내용이 기계적이고 도착 보드와 겹친다. 나눔을 5초마다 넘기기 — 긴 나눔을 읽다가 사라진다.
- **결과**: 나눔은 한마디보다 길어 넘김 간격을 11초로 늘리고 세 줄에서 자른다(전체는 말풍선을 눌러 장 본문 아래에서). 홈에서 저절로 움직이는 카드가 하나 줄었다. `trail_note` 테이블과 그동안 쌓인 한마디는 지우지 않고 그대로 둔다(실사용자 데이터 — 지울 때는 행 수 확인 후). `pnpm test-user notes` 는 `shares <장>`(예시 나눔)으로 바꿨다.



### ADR-030 길은 그날 열린다 — 장소·제목·지도 마커를 날짜에 맞춰 드러내기 — 채택 (2026-11-01)
- **결정**: 아직 열리지 않은 장(`readingDate > 오늘`)의 장소·제목·요약을 어디에도 보여 주지 않는다. 기준은 본문 공개와 같은 날짜(`isDayUnlocked`) — 읽은 진도가 아니라 날짜라서 밀린 사람도 오늘 장까지는 보인다.
  - 홈 진행도: 열리기 전 칸은 장소 대신 여는 날짜(`11/12`). 그날 처음 볼 때(pathMotion intro) 오늘 열린 칸의 날짜가 빠지고 장소 이름이 톡 떠오른다.
  - 여정 지도: 출발지 싯딤 + 열린 장의 장소만 그린다(`revealedSites`, `JourneyMap revealed`). 그날 처음 지도를 보면 오늘 장소 마커가 톡 나타난다(기기 localStorage `gilgal_reveal_seen` = 날짜). 도착 화면 지도도 같은 규칙.
  - 여정 장 카드: ◀ ▶·눈금·지도 장소 누르기가 열린 장까지만. 출발 전에는 "아직 열리지 않은 길"과 첫 길이 열리는 날만.
  - 여정 목록·진행도 시트·열리기 전 장 주소(`/day/N`): 제목·장소 없이 "아직 열리지 않은 길" + 여는 날.
  - 안내 문구: "내일은 8장, 에발산으로 가요" → "내일은 8장, 새로운 길이 열려요".
- **배경**: 운영자 제안 — 여호수아도 갈 길을 다 알고 걷지 않았다. 미리 둘러볼 수 없고 그날 열려야 매일의 걸음이 기대가 된다.
- **대안**: 읽은 진도 기준으로 드러내기 — 밀린 사람은 오늘 읽을 장도 가려진다. 개관 탭까지 열린 ACT 만 — 운영자 결정으로 개관은 그대로(큰 그림은 알고 출발하되, 한 걸음씩의 길은 그날 열린다).
- **결과**: 출발 초반 지도는 대부분 비어 있다(지형만). 개관 탭과 성경 자체로 앞 내용을 알 수 있으니 "비밀"이 아니라 경험의 장치다. 서버도 열리기 전 장의 장 소개를 내보내지 않는다(주소 직접 입력 포함).


### ADR-031 셀 없이 개인으로 참여 — "다른 공동체" 자리 — 채택 (2026-11-01)
- **결정**: 청년캠프 셀에 속하지 않은 성도도 참여할 수 있게, 셀 목록에 `cell.personal = true` 인 "다른 공동체" 행 하나를 둔다(`drizzle/0004_personal_cell.sql`: 열 추가 + 행 1개). 온보딩 셀 직접 선택(3단계)에서 셀 목록과 따로, 아래 "청년캠프1 소속이 아니신가요?" 안내와 "셀 없이 개인으로 참여하기" 버튼으로 고른다(셀 목록 맨 아래에 섞으면 잘 안 보이고 셀처럼 읽혀서, 2026-11-01). 고르면 온보딩 완료(`onboarding_status = manual`) — 공동체 인원·도착 보드·나눔에는 그대로 들어가고, 홈의 셀 칩·셀 카드만 보이지 않는다. 도착 보드·나눔의 소속 표시는 "다른 공동체", 나 화면은 "이름 · 다른 공동체 · 개인 참여".
- **배경**: 운영자 요청 — 소속 셀이 없는 성도도 함께 읽고 싶다. "무소속"은 어감이 좋지 않아 "다른 공동체에서 개인으로 참여"로.
- **대안**: `profile.cell_id` 를 비워 두고 온보딩 완료 조건을 바꾸기 — "실명·셀이 있어야 완료"(architecture 5.4)와 공동체 인원 조건(`communityMember`)을 여러 곳에서 바꿔야 한다. 셀 이름으로 특별 행을 알아보기 — 이름을 바꾸면 깨진다.
- **결과**: 기존 온보딩·통계 쿼리는 그대로. 로스터에는 쓰지 않는다(셀 직접 선택과 같음). 이 사람들끼리 셀 카드로 묶이지 않는다. 셀 정정은 지금처럼 운영자가 DB에서 `profile.cell_id` 를 바꾼다.


### ADR-032 런타임 DB 드라이버를 node-postgres(pg) + attachDatabasePool 로 — 채택 (2026-11-01)
- **결정**: `lib/db/index.ts` 를 postgres.js 에서 `pg` Pool + `@vercel/functions` 의 `attachDatabasePool` 로 바꾼다. 풀 max 5, 놀던 연결 5초 뒤 정리, 연결 10초·질의 15초(클라이언트 `query_timeout` + 서버 `statement_timeout`)에서 실패. 운영 스크립트(`scripts/`)는 postgres.js 그대로.
- **배경**: 오픈 전날 운영(read-joshua.vercel.app)에서 로그인한 화면, 특히 쿼리를 가장 많이 동시에 보내는 홈이 첫 요청 뒤로 응답 없이 멈췄다. DB 는 정상(직접 질의 10ms, 잠금 없음)이었고, 같은 코드·DB 를 로컬 dev·로컬 프로덕션 빌드로 띄우면 20/20 정상 — Vercel Fluid compute 에서 인스턴스가 쉬었다 깨어나는 사이 붙잡고 있던 연결이 죽은 채 남아, 그 연결로 보낸 쿼리가 영원히 기다린 것으로 본다. postgres.js 에는 질의 시간 제한이 없어 한번 걸리면 그 인스턴스의 풀 전체가 묶였고, DB 쪽에도 질의 도중 멈춘 연결(`active`+`ClientRead`)이 쌓여 엉뚱한 요청에 statement timeout 오류가 전달됐다.
- **대안**: postgres.js 에 idle_timeout 등만 추가(먼저 시도, 커밋 7774813) — 질의 도중 멈춤은 못 막는다. 요청마다 연결 생성 — 풀러 연결 비용이 매번 든다.
- [추가 2026-11-01] 왕복 줄이기: 도착 보드 질의 5개 → 2개(앞줄+인원 창 함수 / 전체 인원+내 순위), 프로필·내 읽기 기록을 동시에(`requireMemberWithProgress` — 홈·여정·나·개관·본문). 홈 한 번에 DB 왕복 약 10 → 7, 차례로 기다리는 단계 4 → 3. 모두에게 같은 내용의 짧은 공유 캐시는 오픈 후 부하를 보고 정한다.
- **결과**: Vercel 이 공식 지원하는 조합이라 멈추기 전 연결 정리가 보장된다. 그래도 응답이 없으면 15초 안에 오류로 끝나 인스턴스 전체가 묶이지 않는다. 의존성 `pg`, `@vercel/functions`, `@types/pg` 추가. drizzle 질의 코드는 그대로(`db.execute` 미사용).


### ADR-033 하루는 새벽 4시에 바뀐다 — 채택 (2026-11-01)
- **결정**: 서비스의 "오늘"을 KST 자정이 아니라 새벽 4시 기준으로 바꾼다(`lib/time` `DAY_START_HOUR = 4`, `toServiceDate`, `serviceDayStart`). `todayKst()` 가 서비스 날짜를 돌려주므로 장 공개(`readingDate <= today`), 깃발·"오늘의 장", "오늘 함께 걸은 동행자" 집계, 하루 나눔 수 제한, 완주 회고의 장별 날짜가 모두 4시 경계를 따른다. 오픈 전 운영 테스트 모드도 첫 장이 열리는 11/2 04:00 에 꺼진다. `GILGAL_DEV_NOW` 에 날짜만 주면 새벽 4시 전에도 그 날짜가 서비스 날짜가 되게 맞춘다.
- **배경**: 운영자 요청 — 밤늦게 읽는 사람이 자정을 넘기면 다음 날 장으로 넘어가 버린다. 청년 공동체는 자정 넘어 읽는 경우가 많다.
- **대안**: 자정 유지 — 단순하지만 밤 12시~새벽 사이에 읽은 사람이 "어제 장"을 놓친 것처럼 보인다. 사용자별 시간대·경계 설정 — 이 규모에는 과하다.
- **결과**: 새 장은 새벽 4시에 열린다(자정에 미리 읽을 수 없다). 저장된 완료 시각(`completed_at`)은 실제 시각 그대로라 데이터 변경은 없다. 나눔의 "11월 7일" 같은 표시는 실제 달력 날짜(자정 기준)를 그대로 쓴다.


### ADR-034 나눔은 한 사람이 한 장에 하나 — 채택 (2026-11-02)
- **결정**: 한 사람은 한 장(캠페인·장)에 지우지 않은 나눔을 하나만 가진다. 서버(`createComment`)가 먼저 확인해 `exists` 로 돌려보내고, DB 부분 유니크 인덱스 `reading_comment_one_per_day_uq (campaign, day_no, user_id) WHERE deleted_at IS NULL`(`drizzle/0005_one_share_per_day.sql`)가 두 탭·두 번 누르기 같은 동시 요청까지 막는다. 지운 나눔은 세지 않아 지우면 다시 쓸 수 있고, 운영자가 숨긴 나눔은 남아 있는 것으로 센다(작성자는 보고 고칠 수 있다). 화면: 이미 남긴 장에서는 본문 아래 쓰기 줄이 "이 장의 나눔을 남겼어요 · 내 나눔 보기"가 되어 내 나눔으로 데려가 강조(flashLift)하고, 도착 화면의 "나눔 남기기"도 "내 나눔 보기"가 된다. 고치기는 내 나눔 카드의 "수정".
- **배경**: 운영자 요청 — 장마다 한 사람 한 나눔이면 나눔 목록이 고르고, 한 사람이 여러 번 써서 목록을 채우지 않는다.
- **대안**: 화면에서만 막기 — 두 탭·느린 네트워크에서 중복이 생긴다. 하루 수 제한(20)만 두기 — 같은 장에 여러 개를 막지 못한다.
- **결과**: 적용 전 테스트 캠페인(`joshua-2026-test`)에 있던 중복 3묶음 9행은 가장 최근 것만 두고 6행을 지운 것으로(소프트 삭제) 처리했다. 운영 캠페인에는 나눔이 없었다. 하루 나눔 수 제한(20)은 그대로 둔다.

### ADR-035 본문 절 도구 · 개인 형광펜 · 접히는 나눔 입력창 — 채택 (2026-11-03)
- **결정**: (1) 본문 절을 누르면 고르고(여러 절) 하단 도구(`components/reading/VerseTools.tsx`)로 형광펜·복사·나눔에 넣기를 한다. 나눔 입력창이 열려 있으면 절 누르기는 지금처럼 입력창이 구절 번호로 받는다(`#reader-root[data-quoting]`). (2) 형광펜은 DB `verse_highlight`(user·장·절, 본문 글자 없음)에 저장하고 서버 액션 `setHighlightsAction`(열린 장만)으로 긋고 지운다. 화면은 낙관적 반영 후 실패 시 되돌린다. 입력창은 같은 값을 클라이언트 저장소(`lib/reading/highlightStore.ts`)로 받아 "내 형광펜" 칩을 보여 준다. (3) 입력창(ComposerDock)은 본문 쪽 터치 끌기에 자판을 내리고 한 줄로 접히며, "이어 쓰기"는 누르는 순간 포커스해(flushSync) 자판을 다시 올린다. (4) 형광펜은 줄마다 글자에만 칠한다(`--color-hl`, 읽기 배경별 값). (5) 구절 본문은 하단 시트 없이 그 자리에서 펼친다 — 나눔 카드의 구절 표기와 입력창의 고른 구절 칩이 같은 펼침(`VerseInline`)을 쓴다. 단 입력창 칩은 "본문이 화면에 있으면 거기로, 없으면 펼쳐서" — 이 장 본문 화면이면 입력창을 접고 그 절로 이동해 잠깐 반짝이고(`data-flash`), 다른 장 구절·본문 없는 화면(나눔 탭에서 고치기)은 펼친다. 표시는 세 가지로 줄인다: 노랑 = 형광펜, 칠한 절 번호 + 얇은 밑줄 = 고른 절(도구·입력창 공통), 회색 알약 = 구절 표기.
- **배경**: 모바일에서 나눔을 쓰며 구절을 고르려면 자판을 손으로 내리고 큰 입력창 위 좁은 틈으로 본문을 찾아야 했다. 본문을 직접 복사해 붙이는 사람도 있는데 꾹 눌러 끌어 고르기가 번거롭다. 고른 절의 배경색은 글자를 흐리게 했고, 구절 시트는 나눔 글을 가렸다. 운영자 제안: 갓피플 성경처럼 절을 누르면 형광펜·복사.
- **대안**: 형광펜을 기기(localStorage)에만 — 기기를 바꾸면 사라지고 서버가 입력창 칩을 처음부터 그릴 수 없다. 여러 색 형광펜 — 고르는 단계가 늘어 한 색으로 시작. 스크롤만으로 접기 — 자판이 올라올 때 생기는 스크롤에도 접혀 버려 터치 이동만 본다. 구절 팝오버(누른 자리 옆) — 작은 화면에서 위치 계산·가림이 생겨 카드 안 펼침으로.
- **결과**: 마이그레이션 0006(테이블 추가만, 운영 코드와 무관). [변경 2026-11-03] "본문에서 고르기" 버튼은 버튼 없이도 고를 수 있어 헷갈린다는 의견으로 뺐고(끌어 넘기면 접힘은 유지), 펼친 구절의 출처 표기(본문 화면 끝에 있음)와 입력창의 "남긴 나눔은 홈에서도…" 안내는 공간을 줄이려 뺐다. 복사는 사용자가 고른 절을 사용자 클립보드에 넣을 뿐 서비스가 본문을 따로 저장·전송하지 않는다. 형광펜은 본인만 보며 다른 사람·운영자 화면에 쓰이지 않는다.

### ADR-036 관리자 지표 화면과 하루 방문 기록 — 채택 (2026-11-03)
- **결정**: 나 탭 아래 `/me/admin` 에 관리자 지표 화면을 둔다. 관리자는 DB 에서 `profile.is_admin` 을 직접 켜고(화면에서 권한을 주고받는 기능 없음), 나 탭의 "관리자" 줄은 관리자에게만 보이며 관리자가 아니면 주소를 직접 열어도 404(`requireAdmin`). 지표: 참여자·온보딩 대기, 오늘 방문, 오늘의 장 읽은 사람, 열린 장 모두 읽은 사람, 날짜별 방문·읽은 사람(읽은 사람 = 그날 서비스 날짜에 완료 기록을 남긴 사람), 장별 읽은 사람, 셀별 진행(오늘·진행률·모두 읽음), 개인별 진행(읽은 장·마지막 읽음·마지막 방문, 밀린 사람 먼저·이름/셀 찾기). 집계 대상은 공동체 집계와 같은 기준(`communityMember`, 테스트 계정 제외). 계산은 순수 함수 `lib/admin/metrics.ts`(테스트), 조회는 `lib/data/admin.ts`(행 4묶음을 한 번에 받아 메모리에서 셈). 방문은 새 테이블 `daily_visit`(사람·서비스 날짜당 한 행)에 `requireMember` 가 응답 뒤(`after`) 남기고, 서버 인스턴스 안에서는 같은 날 다시 쓰지 않는다.
- **배경**: 운영자 요청 — 이전 서비스(빈무덤·셀라)처럼 참여 지표를 한 화면에서 보고, 밀린 동행자를 셀 리더에게 알려 줄 수 있게. 기존에는 방문 기록이 없었다.
- **대안**: 관리자 권한을 화면에서 주고받기 — 소규모 비공개 서비스라 DB 직접 부여로 충분하고 권한 상승 경로를 만들지 않는다. 방문을 화면마다 기록(페이지뷰) — 쓰기가 많고 지표에 필요 없다. 별도 분석 도구 — 실명·셀 기준 집계가 필요해 DB 집계가 맞다.
- **결과**: 방문 기록은 배포 시점(2026-11-03)부터 쌓여 그 전 날짜는 방문 0 으로 보인다. 관리자 화면은 실명·셀·읽은 날을 보여 주므로 관리자 부여는 신중히(카카오 회원번호는 읽지 않는다). 관리자 부여: `UPDATE profile SET is_admin = true WHERE real_name = '이름' AND ...;`(동명이인 주의 — 셀로 함께 확인).

### ADR-037 장소 사건 연출(지도) — 채택 (2026-11-04)
- **결정**: 장별 `mapEffect`(lib/journey/days.ts)를 지도 위 짧은 연출로 그린다(`components/map/MapEffects.tsx`, `JourneyMap` 의 `effect` 속성). 여정 탭은 장을 고를 때(길이 그려진 뒤 0.65초, 요단은 바로), 도착 화면은 아바타가 도착한 뒤(요단은 건너기 전부터) 한 번 재생하고 key 가 바뀌면 다시 재생한다. 24장 모두 연출이 있다(2026-11-04 완료): 1 부름·요단 쪽 길, 2 정탐꾼 왕복, 3 물이 쌓이고 아래 물길이 마름→다시 흐름(여정 탭에선 마른 뒤에 건넘), 4 열두 돌, 5 만나가 그침, 6 일곱 바퀴·외침·무너짐, 7 물러남·아골 돌무더기, 8 에발산 빛줄기, 9 기브온 사람들이 길갈로, 10 해(기브온)와 달(아얄론), 11 메롬 물가로 모였다 흩어짐, 12 지나온 장소 반짝임, 13~17·19 나뉜 땅(`land-*`, `TERRITORIES` — 이름과 함께 채워져 그 장을 보는 동안 남음), 18 회막이 길갈→실로, 20 도피성 여섯 곳 등불, 21 레위 성읍 48곳 점, 22 동쪽 지파가 건너감·요단 가 제단, 23 사방에서 세겜으로, 24 모든 장소 반짝임·큰 돌. 남는 그림(땅·해와 달·돌·등불)은 그 장을 보는 동안 두고 움직임은 끝나면 사라진다.
  [변경 2026-11-04] 성도님이 그림만 보고 무엇인지 알아채기 어려운 연출(1 길, 7 물러남, 8 빛줄기, 9 기브온, 11 메롬, 12 반짝임, 22 제단)은 뺐다 — 기준은 "점이어도 보는 사람이 바로 알아채는가"(운영자). 남긴 17개 장(2·3·4·5·6·10·13~21·23·24)은 연출과 함께 짧은 사건 이름표를 3초쯤 띄운다(`CAPTIONS`, 지파 땅은 지파 이름이 대신).
  [변경 2026-11-04] 후반(정복 이후)은 "걸음"이 아니라 "채워짐"으로: 13장부터 앞 장들에서 나뉜 땅이 옅게 쌓이고(`landsBefore`·`GivenLands`, JourneyMap `lands`) 그 장의 땅만 이름과 함께 채워진다. 19장에서 다 채워지고, 21장은 레위 성읍 뒤 온 땅이 한 번 빛나며 "온 땅을 다 주심"(21:43). 20장 이후·완주 화면은 모든 땅이 깔린다. 갈렙 땅은 유다 안이라 유다가 나뉜 뒤에는 겹쳐 칠하지 않는다.
  [변경 2026-11-04] 성경 지리 점검: 19장 "나머지 일곱 지파"를 일곱으로 셀 수 있게 북쪽 넷(스불론·잇사갈·아셀·납달리)·베냐민·단(베냐민 띠 서쪽 끝)·시므온(유다 남쪽 작은 땅)으로 나눴다(새 띠 없이). 23장은 모인 장소가 본문에 없어 세겜이 아니라 땅 가운데(`EFFECT_SPOTS.assembly`)로 모인다. 에발산 위치(실제는 세겜 북쪽)·띠 모양 경계는 교회 검토 후 정한다.
  [변경 2026-11-04] 도착 화면 17개 장 점검: 땅 전체에 걸친 장(19·20·21장, `WIDE_EFFECTS`)은 도착 화면에서도 확대하지 않고 땅 전체(EXPLORER_CROP, meet)를 보여 준다. 아바타 위 "내 위치" 이름표와 겹치던 5·10·13장 이름표·해 위치를 옮겼다. 21장 온 땅 빛남에서 유다 안의 갈렙·시므온은 겹쳐 칠하지 않는다.
  [변경 2026-11-04] 지도(여정 탭·도착·완주)에서 "내 위치"·"오늘 N장" 글자 이름표를 없앴다 — 아바타는 내가 꾸민 얼굴이라 이름표 없이도 알아보고, "오늘의 장"은 장 카드가 알려 주며, 이름표가 연출 이름표·지명과 자꾸 겹쳤다. 깃발(오늘의 장)과 아바타는 그대로. 홈 진행도는 다른 화면이라 그대로. 움직임 줄이기 설정이면 그리지 않는다(`.fx`).
  [변경 2026-11-06] 앞의 변경에서 뺐던 일곱 장(1·7·8·9·11·12·22)을 새 장면으로 다시 넣어 24장 모두 연출이 있다 — 초반에 연출이 이어지다 7·8장에서 끊기면 아쉽다는 운영자 의견. 이제는 사건 이름표가 있어 그림만으로 알아채지 않아도 된다. 1장 약속의 땅이 한 번 빛남(21장 "온 땅을 다 주심"과 짝), 7장 아이에서 되밀려 내려온 뒤 아골 골짜기 돌무더기(7:26, 진노는 그리지 않음), 8장 아이의 불과 연기 → 에발산 제단과 낭독, 9장 기브온 사람들이 길갈로 왔다가 사흘 길 되돌아감, 11장 메롬 쪽에 모였다 흩어짐 → 하솔이 불탐, 12장 숫자가 31까지 오름, 22장 동쪽 지파 귀환과 가나안 쪽 요단 가 제단(22:11). 12장은 왕 31명의 자리를 찍지 않고(지리가 부정확해짐) 목록에 있고 지도에 드러난 성(여리고·아이·하솔)만 반짝인다 — 기브온은 조약을 맺어 목록에 없다. 1·12장은 땅 전체를 쓰므로 `WIDE_EFFECTS`. 아골 골짜기·메롬·제단 자리는 개략(`EFFECT_SPOTS`)이라 교회 검토 대상. 또한 사건 이름표를 깃발·아바타보다 위 층(`layer="caption"`)으로 옮겼고, 4장 돌은 요단 바닥에서 가져온 돌이라 둥글게, 7장 돌은 구분되게 거칠게 그린다. 길갈 아바타는 강 서쪽 기슭에 선다.
  [변경 2026-11-06] 여정 탭에서 깃발이 꽂힌 장소를 고른 동안에는 깃발을 숨긴다 — 깃발이 장소 바로 위라 오늘의 장을 볼 때마다 연출·남는 그림(24장 큰 돌 등)과 겹쳤고, 그때는 선택 테두리와 장 카드의 "오늘의 장"이 같은 말을 한다. 연출마다 깃발을 피하는 것보다 단순하고 앞으로 연출을 고쳐도 겹치지 않는다. 오늘 장을 읽은 뒤에는 탭이 그 장으로 열려 첫 화면에 깃발이 없다(아바타가 닿은 뒤라 자연스럽다고 본다).
- **배경**: 여정 화면이 장소 이동만 보여 줘 단조롭다는 운영자 의견. 데이터(mapEffect)는 처음부터 있었고 표현만 Phase 2(T23)로 미뤄 두었다.
- **대안**: 장면 일러스트·영상 — 무겁고 지도와 따로 논다. 장소 아이콘만 바꾸기 — 사건의 움직임이 드러나지 않는다.
- **결과**: 사건을 그림으로만 보여 주고 의미 설명은 붙이지 않는다(본문 해석 금지). 정복 장면은 무너짐 정도로만 부드럽게. 지파 땅·도피성·레위 성읍 위치는 개념도(대략)이며 지파 경계를 정확히 그리지 않는다 — 교회 검토 시 `lib/journey/locations.ts`(TERRITORIES·REFUGE_CITIES·EFFECT_SPOTS)에서 고친다. `MapEffect` 는 장마다 다른 값(예전 `fill-territory` 는 `land-*` 로 나눔).

### ADR-038 지도에 선으로 그리는 길은 1~12장까지, 되짚기는 고른 장까지 — 채택 (2026-11-04)
- **결정**: 지나온 길(옅은 선)과 장의 진한 구간은 실제로 걸은 1~12장(`ROUTE_LAST_DAY` = 첫 territory 장 앞)까지만 선으로 잇는다(`routeTrail`). 13장부터(땅 분배·언약)는 장소만 강조하고 선을 긋지 않는다(`legFrom` = 제자리) — 여정 탭·도착 화면 모두. 여정 탭 되짚기는 고른 장까지의 길만 보여 준다. 채운 아이콘(지나온 장소)은 선과 상관없이 모든 장소.
- **배경**: 운영자 — 회색 지난 길을 지울지 고민. 13장부터는 지도 대표 장소(요단 동쪽·헤브론·실로·세겜)를 오가는 선이 실제 이동처럼 보이고 거미줄처럼 엉켰다. 또 앞 장을 되짚어도 내가 읽은 데까지의 길이 모두 보였다.
- **대안**: 지난 길을 모두 지움 — 깔끔하지만 "여기까지 걸어왔다"는 누적의 동기가 사라진다. 옅게만 — 엉킴·오해는 그대로.
- **결과**: 초반엔 장을 넘길수록 길이 쌓이고, 후반엔 정복까지의 길만 남는다. 13장부터 아바타는 장소 사이를 선 없이 옮겨 간다(여정 탭), 도착 화면에서는 제자리에서 도착 연출만.
