import { avatarSvg, isValidSeed } from "@/lib/avatar";

/**
 * GET /api/avatar/[seed] → marble SVG.
 * seed 만으로 결정되므로 영구 캐시한다. DB 조회가 없어 seed 를 아는 사람이면 볼 수 있지만,
 * seed 는 랜덤 값이고 이름·회원번호와 연결되지 않는다.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/avatar/[seed]">) {
  const { seed } = await ctx.params;
  if (!isValidSeed(seed)) return new Response("invalid seed", { status: 400 });
  return new Response(avatarSvg(seed), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
