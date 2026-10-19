# 길갈 구현 계획

> 기준: `docs/requirements.md`(상단 "확정 변경 사항", 20절 재조정 우선순위), 설계: `docs/architecture.md` v2.
> 각 작업은 착수 전 범위를 공유하고, **DB 변경·대규모 구현은 승인 후 진행**한다(CLAUDE.md).
> 개정: v2 2026-10-19 — 독립 Supabase, 지도 기본판 Phase 1 편입, 공개 정책 확정 반영.
> 개정: v3 2026-10-19 — Selah식 온보딩(셀 목록 선택), 단일 Supabase 프로젝트, 서비스 내 본문(Mock→허락 후 원문), Vercel 기본 도메인, 관리자 셀 화면 제외. T0~T2 승인됨.

## 0. 일정과 마일스톤

오늘 2026-10-19(월) → 오픈 **11/2(월)** 까지 14일.

| 날짜 | 마일스톤 |
|---|---|
| 10/20~10/21 | 기반: 프로젝트 초기화, 시간/여정 설정+테스트, **운영자: Supabase 생성·카카오 Redirect 추가·Selah CSV 준비** |
| 10/22~10/23 | DB 마이그레이션(승인), 로그인·프로필·명단 매칭·온보딩, 이관 스크립트 |
| 10/24~10/26 | 읽기 화면(서비스 내 본문, Mock), 읽기 완료, 홈, 나의 여정, 아바타 |
| 10/27~10/28 | 기본 SVG 여정 지도, 모바일 UI 다듬기 |
| 10/29 | **Phase 1 기능 완료(코드 프리즈 후보)**, 운영 배포, 실제 Selah 계정으로 검증 |
| 10/30~10/31 | 버그 수정 · (여유 시) 댓글 최소판 |
| 11/1 | 테스트 데이터 정리, 이관 최종 실행, 최종 점검 |
| **11/2** | **오픈** |
| 11/3~11/14 | Phase 2: 공동체·셀 진행도, 아바타 참여 현황, 지도 고도화 |
| ~11/9 | 댓글·공감·관리(오픈 전 미포함 시) |
| **~11/21** | Catch-up 안내 UX 배포 (11/30 시작 전 여유) |
| **~11/25** | 완주 회고 `/finale` 배포 (**첫 완주 가능일 11/28 이전 필수**, 늦어도 11/27) |
| 11/26~11/29 | UX 개선, 성능·보안 점검 |

### 댓글 오픈 전 포함 검토

- 댓글은 테이블 2개 + 서버 액션 4개 + 목록 UI + 관리자 숨김으로 약 1.5~2일 분량.
- **판단**: Phase 1이 10/29까지 끝나면 10/30~31에 "작성·삭제·공감·관리자 숨김" 최소판을 넣는다. 그렇지 않으면 오픈 후 첫 주(~11/9)에 배포한다. 관리자 숨김 없이 댓글만 먼저 내보내지는 않는다.
- 판단 시점: 10/29 저녁, 사용자에게 진행 여부 확인.

### 리스크

| 리스크 | 대응 |
|---|---|
| 본문 이용 허락이 오픈 전에 나지 않음 | 서비스 내 본문이 확정 방침이므로 **오픈 영향 큼**. 10/29까지 허락 상황 확인 → 비상 대안(임시 원문 링크 vs 오픈 연기) 결정(architecture 8.5). 허락 후에는 데이터 적재 + `BIBLE_PROVIDER` 변경만 |
| 단일 DB에서 테스트 데이터 혼입 | 테스트 slug `joshua-2026-test` + `profile.is_test`, 삭제는 대상 행 수 확인 후 승인 |
| Supabase/카카오 설정 지연 | T0~T2는 DB 없이 진행 가능. 10/21까지 설정 완료 필요 |
| 11월 셀 편성 변경 | 최신 명단 CSV로 이관 스크립트 재실행(멱등) |
| 카카오톡 인앱 브라우저 로그인 이슈 | 10/29 실기기 검증, 필요 시 외부 브라우저 안내 배너 |
| 무료 플랜 일시 중지/한도 | 4절(architecture) 플랜 확인, 오픈 전 결정 |

---

## 1. 작업 목록

표기: **[승인]** = 착수 전 승인 필요, **[운영자]** = 사용자가 직접 하는 작업.

### Phase 1 — 오픈 필수 (10/20 ~ 11/1)

| # | 작업 | 의존 | 검증 |
|---|---|---|---|
| T0 | **[승인]** 프로젝트 초기화: Next.js 16 / React 19 / TS strict / Tailwind v4 / ESLint / pnpm / vitest, `.gitignore`(`data/private/`, `.env*.local`) | — | `tsc --noEmit`, `lint`, `build` 통과 |
| T1 | `lib/brand.ts`, `lib/time.ts`(KST, `GILGAL_DEV_NOW`) | T0 | 단위: UTC 14:59/15:00 경계, production에서 오버라이드 무시 |
| T2 | `lib/journey/campaign.ts`, `days.ts`(24일 제목·ACT·장소·완료 메시지 초안), `schedule.ts`(공개 정책) | T1 | 단위: 24일 매핑, 주일·Catch-up·12/6·2027년 공개, 미래 잠금 |
| S1 | **[운영자]** 길갈 Supabase 프로젝트 **1개** 생성(개발·운영 공용), 연결 문자열, Data API 비활성화, 플랜 확인 | — | `.env.local` 에 키 입력(값은 공유하지 않음) |
| S2 | **[운영자]** 카카오 콘솔(Selah 앱, 기존 항목 유지): 사이트 도메인 `http://localhost:3000` + Redirect URI `http://localhost:3000/api/auth/callback/kakao` 추가. 운영 URI는 T18 배포 직후 실제 Vercel 도메인으로 추가 | — | 로컬 로그인 성공 |
| S3 | **[운영자]** Selah SQL Editor에서 이관용 SELECT 실행 → CSV 2개를 `data/private/` 에 저장 | 승인(11절 3) | 행 수만 공유 |
| T3 | DB 연결(`lib/db`), drizzle 스키마: Auth.js 표준 + `cell`, `roster_entry`, `profile`, `reading_progress` | T0 | 타입체크 |
| T4 | **[승인·DB]** 첫 마이그레이션 생성 → SQL 리뷰 → `migrate`. RLS enable + REVOKE 포함 | T3, S1 | 테이블·RLS(`relrowsecurity`) 확인, anon 키로 접근 불가 확인(Data API 꺼짐) |
| T5 | 인증: Kakao + DrizzleAdapter + `events.signIn`(profile 생성, 카카오 ID 매칭) + `getViewer()` + `/login` + 페이지 가드 | T4, S2 | 신규 로그인 → user/account/profile 생성, 재로그인 시 같은 user |
| T6 | **[승인·DB 데이터]** `scripts/import-selah-roster.ts`(`--dry`, 충돌 리포트, 멱등) | T4, S3 | dry 결과 검토 → 적재 → 행 수 대조 → CSV 삭제 확인 |
| T7 | 온보딩(Selah 방식): 실명 입력 → 실명 매칭(미점유·kakao_id 없는 행 정확히 1건) → 실패 시 **기존 셀 목록에서 선택**(자유 입력·미배정 없음) + 이관 안내 문구 + 보안 대응(architecture 5.4) | T5, T6 | 카카오 ID 매칭 계정은 온보딩 생략, 동명이인·미등록 경로, 회원번호/userId/cellId 위조 요청 거부, 실명 매칭 횟수 제한, 동시 claim 1건 |
| T8 | 아바타: DiceBear 서버 생성, `/api/avatar/[seed]`, `Avatar` | T5 | 재방문 시 같은 SVG, 캐시 헤더, 사용자별 상이 |
| T9 | 디자인 토큰/레이아웃(베이지·스톤·올리브·샌드·뮤트 블루, 세리프 본문), 공통 헤더 | T0 | 360/390/430px 가로 스크롤 없음 |
| T10 | 성경 Provider: `types`, `mock`(Mock 배지), `joshua.ts` 절 수, `static`/`db` 자리(인터페이스만), 원문 검증 스크립트 골격(24장·절 수 대조) | T2 | 저장소에 번역문 없음(grep), Mock 절 수 = `joshua.ts` |
| T11 | `/day/[day]` 읽기 화면(`ChapterReader`: 장·절 구분, 소제목, 글자 크기 조절, 저작권 표기 자리) + `completeDay` 서버 액션 | T2, T4, T5, T10 | 미래 DAY URL/액션 직접 호출 거부, 과거·일요일 완료 가능, 중복 호출 1행·`already`, 외부 이동 없이 읽기→완료 |
| T12 | 완료 연출 `CompletionMoment`(설정 메시지, 마커 한 칸 이동, 진동) | T11 | 3·6·18·24장 메시지, reduced-motion, 새로고침 시 재연출 없음 |
| T13 | 지도 데이터 `locations.ts`(Phase 1 지점·경로·장별 머무름 규칙) + `mapState()` | T2 | 단위: 완료 집합별 활성 지점/마커/점선 구간, 순서 무관 완료 |
| T14 | `JourneyMap` 기본판(SVG, 지점·경로·마커·활성화) | T13, T8 | 0/1/3/12/24 완료 상태 스냅샷(개발 전용 `/dev/map`) |
| T15 | 홈 `/`: 오늘의 여정 + 미니 지도 + 내 여정 n/24 + 오늘 공동체 숫자(단순) + 기간 상태별 분기 | T11, T14 | `GILGAL_DEV_NOW` 10/31, 11/2, 11/8, 11/28, 12/1, 12/6 화면 |
| T16 | `/journey`: 전체 지도 + 24개 점 + 아직 걷지 않은 길 목록 | T14 | 완료 후 증가, 미래 DAY 링크 없음 |
| ~~T17~~ | ~~관리자 셀 배정 화면~~ — **MVP 제외**(셀 정정은 운영자가 Supabase에서 직접). `/admin` 가드는 T28에서 | — | — |
| T18 | **[승인·배포]** Vercel 배포(기본 도메인 `*.vercel.app`, env, `icn1`) → 실제 할당 도메인 확인 → **[운영자]** 카카오 Redirect URI `https://<실제-vercel-도메인>/api/auth/callback/kakao` 추가 → 운영 점검 | 위 전부 | 실제 Selah 회원 계정 로그인→자동 셀 표시→완료, 카카오톡 인앱, iOS/Android |
| T19 | 오픈 준비: 테스트 데이터 정리(대상 확인·승인), 이관 최종 재실행 | T18 | 운영 DB에 test slug 행 0 |

### Phase 2 — 공동체 경험 (11/3 ~ 11/21)

| # | 작업 | 의존 | 검증 |
|---|---|---|---|
| T20 | 공동체 통계(`lib/data/stats.ts`): 오늘/누적/완주자, 완료자 아바타 seed 상위 N | T11 | 다수 계정으로 숫자 대조, 응답에 userId·kakao_id 없음 |
| T21 | 셀 진행도: 같은 셀만, 완료자 아바타 + 미시작 흐린 묶음 | T20 | 다른 셀 접근 불가, 셀 없음 사용자 처리 |
| T22 | 홈 아바타 참여 현황(`AvatarStack` +N, 부드러운 문구), `/community` | T20, T21 | 0/1/8/100명 경계 |
| T23 | 지도 고도화: 요단 횡단 애니메이션, ACT별 표현 전환, 지파 영역 채우기, 실로 거점, 도피성, 동편 귀환 | T14 | 24단계 스냅샷, reduced-motion |
| T24 | Catch-up 안내 UX(미완료 목록, 완주자 분기) — **~11/21** | T16 | `GILGAL_DEV_NOW` 12/1, 12/6 |

### Phase 3 — 나눔과 완주 (오픈 전 일부 ~ 11/29)

| # | 작업 | 의존 | 검증 |
|---|---|---|---|
| T25 | **[승인·DB]** `comment`, `comment_reaction` 마이그레이션 | T4 | T4와 동일 절차 |
| T26 | 댓글 작성/수정/삭제(soft), 최신순/공감순 | T25, T11 | 타인 댓글 수정·삭제 거부, 미래 DAY 거부, 길이 제한 |
| T27 | 공감 토글(낙관적 UI) | T26 | 연타·동시 요청에도 1건, 취소 |
| T28 | `/admin` 가드 + 관리자 댓글 숨김/복구 (T26과 같은 배포) | T26 | 비관리자 차단, 숨김 비노출 |
| T29 | `/finale` 완주 회고 — **~11/25, 늦어도 11/27** | T14 | 24/24 완료 시 진입, 미완료 안내, 종료 후에도 접근 |
| T30 | 애니메이션·UX 개선, 모바일 점검(iOS Safari, Android Chrome, 카카오톡 인앱) | 전부 | requirements 22절 체크리스트 |
| T31 | 성능·보안 점검(쿼리 수, 인덱스, 서버 액션 권한, 노출 필드, 앱 전용 DB 롤 검토), README(환경변수·마이그레이션·이관·TODO) | 전부 | `security-review` |
| T32 | **[승인]** (허락 후) 개역개정 원문 연결: 공식 데이터 → 변환 → `static` JSON 또는 `bible_verse` 적재 → 검증(24장·절 수) → `BIBLE_PROVIDER` 전환, 저작권 표기 | 허락 | 24장 전 절 표시, 표기 문구, Mock 배지 사라짐 |

---

## 2. 의존성 요약

```
T0 ─┬─ T1 ── T2 ─┬─ T10 ─┐
    │            ├─ T13 ── T14 ─┬─ T15, T16 ── T24
    │            │              ├─ T23
    │            │              └─ T29
    ├─ T3 ── T4 ─┼─ T5 ─┬─ T7
    │      (S1)  │ (S2) ├─ T8
    │            │      └─ T11 ── T12, T20 ── T21 ── T22
    │            └─ T6 (S3)
    └─ T9                 T25 ── T26 ── T27, T28
```

## 3. 공통 검증 방법

- **자동**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`(vitest — `time`, `schedule`, `mapState`, 매칭 규칙, 권한 헬퍼), `pnpm build`.
- **시간 여행**: 개발 서버에서 `GILGAL_DEV_NOW=2026-11-08T10:00:00+09:00` 등으로 기간별 화면 확인.
- **데이터 격리(단일 프로젝트)**: 로컬·Preview는 `GILGAL_CAMPAIGN=joshua-2026-test`, 테스트 계정은 `profile.is_test=true`. 테스트 데이터 정리는 대상 행 수를 먼저 보여주고 승인 후 삭제. 이관된 실제 명단은 테스트 중 수정하지 않는다.
- **DB 변경**: `drizzle-kit generate` → SQL 리뷰 → 승인 → `DIRECT_URL` 로 `drizzle-kit migrate`. `push` 금지.
- **Selah 보호**: 작업 후 `git -C C:\side-project\project-selah status` 가 변경 없음을 확인. Selah DB 접속 정보는 길갈 env에 없음.
- **수동 E2E**: requirements 22절 시나리오를 Phase 종료 시마다 실행, 결과를 그대로 보고.

## 4. 진행 현황

### 완료 — T0~T2 (2026-10-19, 승인 후 진행)

- T0: Next.js 16.1.6 / React 19.2.3 / TypeScript 5.9 / Tailwind v4 / ESLint 9 / Vitest 3.2, pnpm 10.18.3(`packageManager`, corepack). `.env.example`, `.gitignore`(`data/private/`).
- T1: `lib/brand.ts`, `lib/time.ts`(+ `time.test.ts`).
- T2: `lib/journey/campaign.ts`, `locations.ts`(지점 이름만, 좌표는 T13), `days.ts`(24일 콘텐츠 초안), `schedule.ts`(+ `days.test.ts`, `schedule.test.ts`).
- 검증: 테스트 59개 통과, `typecheck`·`lint`·`build` 통과, `GILGAL_DEV_NOW` 로 11/8(쉼의 날)·11/9(DAY 7)·12/1(Catch-up) 임시 홈 확인.
- 남은 검토: `days.ts` 의 장 제목·완료 메시지 문구(초안).

### 다음 — T3~T7 (DB·로그인·이관·온보딩)

선행 조건: 운영자 S1(Supabase 생성, `.env.local` 입력), S2(카카오 localhost URI 추가), S3(Selah CSV, 이관 방식 승인).
진행 방식: T3 스키마 작성 → 생성된 마이그레이션 SQL 제시 → **승인 후** T4 적용 → T5 로그인 → T6 이관(dry-run 결과 제시 후 승인) → T7 온보딩.
