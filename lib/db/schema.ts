import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/**
 * 길갈 DB 스키마 (architecture 9절).
 *
 * - 모든 테이블은 RLS 를 켜고 정책을 두지 않는다(.enableRLS()). 앱은 서버에서 소유 롤로
 *   접속하므로 영향이 없고, Data API(anon/authenticated) 경로는 전면 거부된다(ADR-006).
 * - Auth.js 테이블은 @auth/drizzle-adapter 표준 정의 그대로 둔다(ADR-014).
 *   서비스 정보는 profile 에 분리한다.
 */

// ─── Auth.js 표준 테이블 ──────────────────────────────────────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    // 카카오 회원번호. (provider, providerAccountId) PK 가 회원번호의 유일성을 보장한다.
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => [
    primaryKey({ columns: [a.provider, a.providerAccountId] }),
    index("account_userId_idx").on(a.userId),
  ],
);

export const sessions = pgTable(
  "session",
  {
    sessionToken: text("sessionToken").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (s) => [index("session_userId_idx").on(s.userId)],
);

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// 어댑터의 테이블 타입은 enableRLS() 가 반환하는 타입을 받지 않는다. enableRLS() 는 테이블 객체를
// 그대로 바꾸므로 선언과 분리해 호출한다(스키마·마이그레이션 결과는 동일).
users.enableRLS();
accounts.enableRLS();
sessions.enableRLS();
verificationTokens.enableRLS();

// ─── 셀·명단 ──────────────────────────────────────────────────────────────

/** 셀 목록. Selah 명단의 셀 이름 집합으로 이관하고, 이후 정정은 운영자가 DB에서 직접 한다. */
export const cells = pgTable("cell", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const ROSTER_SOURCES = ["selah_member", "selah_roster", "manual", "admin"] as const;
export const CLAIM_METHODS = ["kakao_id", "real_name"] as const;

/**
 * 이관 명단. 로그인한 사용자가 카카오 회원번호 또는 실명으로 행을 "claim" 하면
 * 실명·셀이 프로필에 채워진다(architecture 5.3, 5.4).
 */
export const rosterEntries = pgTable(
  "roster_entry",
  {
    id: serial("id").primaryKey(),
    // NULL = 카카오 회원번호를 모르는 명단 행. 실명 매칭 성공 시 백필한다.
    kakaoId: text("kakao_id").unique(),
    realName: text("real_name").notNull(),
    cellId: integer("cell_id")
      .notNull()
      .references(() => cells.id),
    source: text("source", { enum: ROSTER_SOURCES }).notNull(),
    // 한 사용자는 한 행만 claim 할 수 있다(UNIQUE). 계정 삭제 시 claim 만 풀린다.
    claimedBy: text("claimed_by")
      .unique()
      .references(() => users.id, { onDelete: "set null" }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimMethod: text("claim_method", { enum: CLAIM_METHODS }),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (r) => [
    unique("roster_entry_real_name_cell_id_uq").on(r.realName, r.cellId),
    index("roster_entry_real_name_idx").on(r.realName),
    check("roster_entry_source_chk", sql`${r.source} IN ('selah_member','selah_roster','manual','admin')`),
    check("roster_entry_claim_method_chk", sql`${r.claimMethod} IN ('kakao_id','real_name')`),
  ],
).enableRLS();

// ─── 프로필 ───────────────────────────────────────────────────────────────

export const ONBOARDING_STATUSES = ["pending", "matched", "manual"] as const;

export const profiles = pgTable(
  "profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    // account 에서 복사한 카카오 회원번호. 매칭·운영 확인용이며 클라이언트로 보내지 않는다.
    kakaoId: text("kakao_id").notNull().unique(),
    realName: text("real_name"),
    cellId: integer("cell_id").references(() => cells.id, { onDelete: "set null" }),
    onboardingStatus: text("onboarding_status", { enum: ONBOARDING_STATUSES })
      .notNull()
      .default("pending"),
    nameMatchAttempts: smallint("name_match_attempts").notNull().default(0),
    isAdmin: boolean("is_admin").notNull().default(false),
    // 개발·테스트 계정: 참여자 수·아바타 목록·셀 통계에서 제외한다(architecture 9.3)
    isTest: boolean("is_test").notNull().default(false),
    avatarStyle: text("avatar_style").notNull().default("marbles"),
    avatarSeed: text("avatar_seed").notNull().unique(),
    avatarOptions: jsonb("avatar_options").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (p) => [
    index("profile_cell_id_idx").on(p.cellId),
    check(
      "profile_onboarding_status_chk",
      sql`${p.onboardingStatus} IN ('pending','matched','manual')`,
    ),
  ],
).enableRLS();

// ─── 읽기 기록 ────────────────────────────────────────────────────────────

export const readingProgress = pgTable(
  "reading_progress",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    // 캠페인 slug. 로컬·Preview 는 joshua-2026-test 로 운영 기록과 분리된다.
    campaign: text("campaign").notNull(),
    dayNo: smallint("day_no").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (r) => [
    unique("reading_progress_user_campaign_day_uq").on(r.userId, r.campaign, r.dayNo),
    index("reading_progress_campaign_day_idx").on(r.campaign, r.dayNo),
    index("reading_progress_campaign_completed_idx").on(r.campaign, r.completedAt),
    check("reading_progress_day_no_chk", sql`${r.dayNo} BETWEEN 1 AND 24`),
  ],
).enableRLS();

// ─── 성경 본문 (db provider) ──────────────────────────────────────────────

/**
 * BIBLE_PROVIDER=db 일 때 읽는 본문. 저장소에는 번역문을 커밋하지 않고,
 * 운영자가 제공한 파일을 scripts/load-bible.ts 로 적재한다(architecture 8.5).
 */
export const bibleVerses = pgTable(
  "bible_verse",
  {
    translation: text("translation").notNull(),
    book: text("book").notNull(),
    chapter: smallint("chapter").notNull(),
    verse: smallint("verse").notNull(),
    // 이 절 앞에 오는 소제목(있을 때만)
    sectionHeading: text("section_heading"),
    text: text("text").notNull(),
  },
  (v) => [primaryKey({ columns: [v.translation, v.book, v.chapter, v.verse] })],
).enableRLS();

// ─── 나눔 (댓글 · 공감) ───────────────────────────────────────────────────

export const COMMENT_MAX_LENGTH = 1000;

/**
 * 장별 나눔(architecture 8.7). 성경 해설이 아니라 공동체 나눔 공간이다.
 * - 삭제는 작성자 soft delete(deleted_at), 운영자 숨김은 hidden_at — 둘 다 행은 남긴다.
 * - campaign slug 로 로컬·Preview 나눔이 운영 화면에 섞이지 않게 한다(ADR-015).
 */
export const readingComments = pgTable(
  "reading_comment",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    campaign: text("campaign").notNull(),
    dayNo: smallint("day_no").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // 작성자가 내용을 고친 시각 (화면의 "수정됨")
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenBy: text("hidden_by").references(() => users.id, { onDelete: "set null" }),
  },
  (c) => [
    index("reading_comment_campaign_day_created_idx").on(c.campaign, c.dayNo, c.createdAt),
    index("reading_comment_campaign_created_idx").on(c.campaign, c.createdAt),
    index("reading_comment_user_idx").on(c.userId),
    check("reading_comment_day_no_chk", sql`${c.dayNo} BETWEEN 1 AND 24`),
    check(
      "reading_comment_content_chk",
      sql`char_length(btrim(${c.content})) BETWEEN 1 AND ${sql.raw(String(COMMENT_MAX_LENGTH))}`,
    ),
  ],
).enableRLS();

/** 공감: 한 사람이 한 나눔에 한 번만 (PK) */
export const readingCommentLikes = pgTable(
  "reading_comment_like",
  {
    commentId: bigint("comment_id", { mode: "number" })
      .notNull()
      .references(() => readingComments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (l) => [primaryKey({ columns: [l.commentId, l.userId] }), index("reading_comment_like_user_idx").on(l.userId)],
).enableRLS();
