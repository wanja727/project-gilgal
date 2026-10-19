import "server-only";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { linkProfileOnSignIn } from "@/lib/data/onboarding";

/**
 * Auth.js v5 + 카카오(Selah 와 같은 앱) + DB 세션 (architecture 3절).
 * 카카오 회원번호는 앱 단위로 발급되므로 Selah 와 같은 앱 키를 써야 기존 회원과 연결된다(ADR-012).
 * 이메일 기반 계정 병합(allowDangerousEmailAccountLinking)은 쓰지 않는다(5.4).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Kakao({
      // Auth.js 기본 이름(AUTH_KAKAO_*)과 Selah 에서 쓰던 이름(KAKAO_CLIENT_*) 모두 허용
      clientId: process.env.AUTH_KAKAO_ID ?? process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET ?? process.env.KAKAO_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  events: {
    /**
     * user/account 행이 만들어진 뒤에 실행된다(signIn 콜백 시점에는 첫 로그인 user 행이 아직 없다).
     * 회원번호는 OAuth 토큰 교환 결과(account.providerAccountId)만 신뢰한다.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "kakao" || !user.id || !account.providerAccountId) return;
      await linkProfileOnSignIn(user.id, account.providerAccountId);
    },
  },
  callbacks: {
    // 세션에는 user.id 만 싣는다. 프로필·셀은 getViewer() 가 요청당 1회 조회한다(ADR-014).
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
