# CLAUDE.md — 길갈 (Gilgal)

여호수아서 24장을 24일 동안 공동체가 함께 읽는 통독 서비스.
**독립된 Supabase 프로젝트**에서 운영하며, Selah(셀라)와는 카카오 OAuth 앱만 공유한다.
기존 Selah 회원은 카카오 회원번호로 연결하고, 실명·셀 정보는 오픈 전 1회 최소 이관한다.

## 반드시 먼저 읽을 문서

1. `docs/requirements.md` — 서비스 요구사항. **모든 개발 작업에서 최우선 기준.** 상단 "확정 변경 사항"이 원래 요청보다 우선한다.
2. `docs/architecture.md` — 아키텍처, 인증, 사용자·셀 이관, DB 스키마, 보안, 설계 결정(ADR).
3. `docs/implementation-plan.md` — 일정, 구현 순서, 의존성, 검증 방법.

요구사항과 현재 구현/설계가 충돌하면 임의로 해결하지 말고, 충돌 내용과 제안을 먼저 보고한다.

## 절대 규칙

- **Selah 보호**: `C:\side-project\project-selah` 는 읽기 전용 참고 자료다.
  - Selah의 코드·DB·환경변수·배포 설정을 생성·수정·삭제하지 않는다. git 작업, 패키지 설치, 스크립트 실행도 하지 않는다.
  - **Selah 운영 DB에 접속하지 않는다**(읽기 포함). 이관 데이터는 운영자가 Selah SQL Editor에서 추출한 CSV로만 받는다.
  - Selah `.env.local` 등 비밀 정보는 값을 출력·복사하지 않는다. Selah 접속 정보를 길갈 환경변수에 두지 않는다.
  - 필요한 코드는 읽고 이해한 뒤 길갈 저장소에 새로 작성한다(필요하면 출처를 주석으로 남김).
- **길갈 DB**: 길갈 전용 Supabase 프로젝트 **하나**를 개발·테스트·운영에 함께 쓴다(개발 DB 없음).
  - drizzle-kit `push` 금지 — `generate` → SQL 리뷰 → 승인 → `migrate`. 마이그레이션 파일은 버전 관리한다.
  - 테스트 데이터는 캠페인 slug `joshua-2026-test` 와 `profile.is_test` 로 실제 데이터와 구분한다.
  - 운영 데이터에 영향을 줄 수 있는 테스트·삭제는 대상 행 수를 먼저 보여주고 **승인 후** 실행한다.
  - DB 연결은 `DATABASE_URL`/`DIRECT_URL` 환경변수로만 결정한다(추후 개발 DB 분리 대비).
- **카카오 앱**: Selah와 공유하는 앱이다. 기존 Redirect URI·도메인은 삭제·변경하지 않고 길갈용만 **추가**한다(운영자 작업).
  - 로컬 `http://localhost:3000/api/auth/callback/kakao`, 운영 `https://<실제-vercel-도메인>/api/auth/callback/kakao`
- **도메인**: 커스텀 도메인 없이 Vercel 기본 도메인(예상 `https://project-gilgal.vercel.app`, 실제 할당 주소 기준).
- **셀·온보딩**: 셀 편성은 Selah에서 이관한 셀 목록·명단이 기준이다. 온보딩은 Selah 방식(카카오 ID → 실명 매칭 → 기존 셀 목록에서 선택)을 따르며 셀 자유 입력은 없다. 셀 정정은 운영자가 DB에서 직접 하므로 관리자 셀 편성 화면은 만들지 않는다.
- **개인정보**: Selah에서 가져오는 항목은 카카오 회원번호·실명·셀 이름뿐. 이관 CSV는 `data/private/`(gitignore)에 두고 적재 후 삭제한다. 카카오 회원번호는 클라이언트로 보내지 않는다.
- **성경 본문**: 본문은 길갈 서비스 **안에서** 장·절 구분해 표시한다(외부 사이트 이동 없음). 개역개정은 저작권 보호 대상이므로 이용 허락 확인 전에는 본문을 수집(크롤링)·저장·표시하지 않고 `BIBLE_PROVIDER=mock` 으로 개발한다. 허락 후 `static`/`db` provider로 연결한다. 번역문을 저장소에 커밋하지 않는다(허락 조건이 허용하기 전까지).
- 서비스가 성경 본문에 대한 AI 해석·신학적 해설을 생성/제공하지 않는다.

## 승인이 필요한 작업

다음은 **계획을 먼저 제시하고 사용자 승인을 받은 뒤** 진행한다.

- 대규모 구현(여러 화면/모듈에 걸친 기능, 새 Phase 착수)
- DB 변경: 테이블/컬럼/인덱스/제약/RLS/권한 추가·변경, 마이그레이션 실행
- 데이터 적재·삭제: 이관 스크립트 실행, 시드, 테스트 데이터 정리
- 새 런타임 의존성 추가, 인증 방식 변경, 배포 설정 변경
- 성경 본문 provider를 `static`/`db` 로 전환(이용 허락 확인 후)

## 설계 결정 기록

- 중요한 결정은 `docs/architecture.md` 의 "설계 결정 기록(ADR)" 섹션에 번호를 붙여 추가한다.
  형식: 결정 / 배경 / 대안 / 결과(트레이드오프).
- 기존 결정을 뒤집을 때는 삭제하지 말고 상태를 "대체됨(ADR-xxx)"으로 바꾼다.
- 구현 계획이 바뀌면 `docs/implementation-plan.md` 도 함께 갱신한다. 요구사항이 바뀌면 `docs/requirements.md` 에 `[변경]` 으로 표시한다.

## 기술 스택

- Next.js 16(App Router, RSC, Server Actions) · React 19 · TypeScript strict · Tailwind CSS v4 · pnpm · vitest
- Auth.js(NextAuth v5) + 카카오 OAuth(Selah와 같은 앱), DB 세션 전략, `@auth/drizzle-adapter` — Auth.js 테이블은 표준 그대로
- Drizzle ORM + postgres.js(`prepare: false`) → 길갈 Supabase PostgreSQL(서울). Supabase Auth/클라이언트 SDK·Data API 미사용
- Vercel 배포(함수 리전 `icn1`)
- 아바타: DiceBear `marbles` (서버에서 SVG 생성, `/api/avatar/[seed]`)
- 지도: 인라인 SVG schematic map (외부 지도 라이브러리 없음)

## 코딩 컨벤션

- 경로 별칭 `@/*`. 서버 전용 모듈(`lib/db`, `lib/auth`, `lib/data`)은 `server-only` 로 표시하고 클라이언트 컴포넌트에서 import 하지 않는다.
- 날짜는 항상 **KST(Asia/Seoul) 기준 `YYYY-MM-DD`** 문자열. 현재 시각은 `lib/time` 의 `nowKst()` 로만 얻는다.
- 장 공개 규칙은 `lib/journey/schedule.ts` 한 곳: `readingDate <= todayKst` 이면 공개, 종료일 없음. 서버에서 검증한다.
- 사용자 식별자는 **항상 서버 세션에서** 얻는다. 클라이언트가 보낸 userId/cellId 는 신뢰하지 않는다. 쓰기 쿼리는 소유권 조건을 WHERE에 포함한다.
- 프로필·셀·관리자 여부는 `getViewer()`(요청당 1회 캐시)로 조회한다.
- 24일 여정 데이터(장 제목·장소·지도 좌표·ACT·완료 메시지)는 `lib/journey/` 에서만 관리한다. 컴포넌트에 하드코딩 금지.
- 서비스명·브랜딩 문구는 `lib/brand.ts` 상수로만 참조한다.
- 성경 본문은 `BibleTextProvider` 를 통해서만 가져온다. 화면은 `ChapterText.mode` 만 보고 렌더링한다.
- 사용자 대면 문구는 "결석/미완료자" 대신 "아직 걷지 않은 길", "아직 여정을 시작하지 않은 동행자" 같은 서비스 언어를 쓴다.
- 주석은 한국어, "왜"를 설명하는 데 집중한다.

## 명령

pnpm이 전역 설치되어 있지 않으면 `corepack pnpm <명령>` 으로 실행한다(`package.json` 의 `packageManager` 버전 사용).

- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test`

## 검증

- 기능 구현 후 `pnpm typecheck`, `pnpm lint`, `pnpm test` 를 실행하고 결과를 그대로 보고한다.
- 날짜 의존 기능은 `GILGAL_DEV_NOW` 로 기간 전/정식/주일/Catch-up/종료 후 시나리오를 검증한다. 프로덕션에서는 무시된다.
- 작업 후 Selah 저장소가 변경되지 않았는지 확인한다.
- `docs/requirements.md` 22절의 검증 시나리오 목록을 최종 체크리스트로 사용한다.
