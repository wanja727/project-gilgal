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
| DB 접근 | Drizzle ORM 0.45 + `postgres`(postgres.js), `prepare: false`(트랜잭션 풀러 호환) |
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
| `lib/db/index.ts` | postgres.js + drizzle (`prepare:false`) | 그대로 |
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
                                ├─ Route Handler: /api/auth/*, /api/avatar/[seed]
                                └─ lib/db (drizzle + postgres.js, prepare:false)
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
  api/avatar/[seed]/route.ts DiceBear SVG
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
- `GET /api/avatar/[seed]` → `image/svg+xml`, `Cache-Control: public, max-age=31536000, immutable`. 목록에서는 `<img>` 로 사용.
- `Avatar` 컴포넌트는 `{ seed, style, options }` 를 받아 향후 꾸미기(`avatar_options`) 확장 시 인터페이스 변경 없음.

### 8.4 참여 시각화 — **[변경 2026-10-24] 오픈 포함, ADR-022**

- 홈 "오늘 N장까지 읽은 사람": 오늘 장 완료 시각 순 1st/2nd/3rd + 4번째부터 아바타 6개와 인원수 + 내 줄(도착 전/후). 주일에는 가장 최근에 열린 장 기준, 보충 기간·종료 후에는 "오늘의 공동체" 숫자 카드.
- 셀 카드: 기준 장(깃발 장, 보충 기간 이후에는 24장 전체)을 완료한 셀원은 이름과 함께 선명하게, 아직인 셀원은 이름 없이 흐리게. 이름은 서버에서부터 보내지 않는다.
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
- 본문 UX: 세리프 본문 17~18px, 줄간격 1.8, 절 번호는 작은 위첨자 색상 구분, 소제목은 산세리프 소형 라벨, 글자 크기 조절(브라우저 로컬 저장), 텍스트 선택 복사 기본 허용(허락 조건에 따라 조정). 본문 끝 → 저작권 표기 → **읽기 완료 버튼** → 댓글.
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
- **[변경 2026-10-24]** 전체 화면 도착 화면(`components/reading/ArrivalScreen.tsx`): 이전 장소 → 이번 장소 길 그리기(내 아바타도 같은 시간·가속으로 길을 따라 걸어감, `components/map/MovingAvatar.tsx` — 움직임 줄이기면 바로 도착 위치) [추가 2026-10-26], 3장은 가나안 점선이 사라지고 영역이 채워짐, 장별 도착 문구(`days.ts` completion), 다음 장 버튼. `completeDay` 가 `completed` 일 때만 띄운다(다시 읽기·이미 완료 시 없음). 오늘의 장이면 도착 순서도 보여 준다.

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
| `/` (탭: 오늘) | 인사 + 'ㄹ'자 진행도·장 정보 시트 + 오늘 장에 도착한 사람 + 우리 셀 | 1 |
| `/day/[day]` | 장의 무대(지도 조각) · 본문 · 글자 크기 · 하단 고정 완료 버튼 · 나눔 · 도착 화면 | 1 |
| `/journey` (탭: 여정) | 지도/목록 전환, 장소 카드 | 1 |
| `/overview` (탭: 개관) | 여호수아 개관(표어·배경·네 부분·수 1:8) — 교회 제공 글, 내용은 `lib/journey/overview.ts` | 1 |
| `/share` (탭: 나눔) | 공개된 장들의 최근 나눔 | 1 |
| `/me` (탭: 나) | 나의 여정 숫자 · 아바타 섞기 · 로그아웃 | 1 |
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
- **결과**: 순위는 핵심 3(경쟁 아님)과 긴장이 있으나 운영자 확정. 완료하지 않은 사람의 명단은 만들지 않는다. 셀 카드의 아직인 셀원은 이름 없이 보낸다.

### ADR-023 지나온 길은 옅게, 한 구간만 진하게 + 여정 되짚기 — 채택 (2026-10-24)
- **결정**: 지도의 지나온 길은 모두 옅은 선(투명도 0.22)으로 그리고, 진하게는 한 구간만 그린다(기본은 가장 최근 구간, 여정 탭에서는 고른 장의 구간). 지나온 장소는 테두리 아이콘, 내 위치·고른 장의 장소만 채운 아이콘. 여정 탭 지도 아래에 "여정 되짚기"(◀ ▶, 24칸 눈금을 끌거나 키보드 ←→)를 두고, 고른 장의 구간을 다시 그리며 장소 카드·장 목록과 연동한다(장소·장 목록을 눌러도 같은 장으로 옮겨 감).
- **배경**: 운영자 피드백 — 17장쯤 되면 진한 선이 겹쳐 산만함. 지나온 길을 직접 넘겨 보고 싶음.
- **대안**: 최근 몇 구간만 진하게 — 여전히 겹침. 자동 재생 — 조작감이 없고 움직임이 많다(reduced-motion 부담).
- **결과**: 전체 경로는 옅게 남아 흐름은 보이고, 한 번에 한 걸음만 읽힌다. 장소 카드의 장 행은 이제 본문 링크가 아니라 장 선택이며, 읽기는 되짚기 카드의 "N장 읽기" 버튼으로 간다.

- **[추가 2026-10-26]** 아직 걷지 않은 길(내 위치~깃발) 점선과 그 장소의 점선 테두리를 없앴다 — 지나온 길의 옅은 선과 겹쳐 산만했다(운영자 피드백). 강조가 옮겨 갈 때 바로 전 장소의 채운 아이콘(되짚기에서는 선택 테두리도)을 위에 겹쳐 두고, 도착할 때 가운데에서 차오르는 연출(`map-pop`)의 반대로 살짝 부풀었다가 가운데로 오므라들며 사라지게 한다(`map-unpop`, 도착 화면 0.5초·되짚기 0.4초 — 머물다 떠나는 느낌. 선택 테두리는 흐려짐). 아직 열리지 않은 장을 되짚기로 고르면 그 구간만 점선으로 보인다. 내 위치 장소는 칠하지 않는다(아바타가 보여 주므로 — 되짚기 중 강조가 둘로 보이지 않게). 아바타 위(아이콘 아래에 둔 장소는 아래)에 "내 위치", 깃발 위에 "오늘 N장"(주일 "N장까지 열림", `flagCaption`) 이름표를 달고, 둘이 같은 장소면 깃발 이름표 하나("내 위치 · 오늘 N장")로 합친다. 이름표 자리 때문에 싯딤·길갈·실로 지명과 여리고·실로·세겜 아바타 위치를 옮겼다.
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
