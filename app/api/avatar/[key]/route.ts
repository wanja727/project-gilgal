import { avatarSvg, isValidSeed } from "@/lib/avatar";
import { parseAvatarKey } from "@/lib/avatarParts";

/**
 * GET /api/avatar/[key] → marble SVG. key = seed 또는 seed~부품(lib/avatarParts.ts).
 * 키만으로 결정되므로 영구 캐시한다. DB 조회가 없어 키를 아는 사람이면 볼 수 있지만,
 * seed 는 랜덤 값이고 이름·회원번호와 연결되지 않는다. 부품은 허용 목록 밖이면 400.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/avatar/[key]">) {
  const { key } = await ctx.params;
  const parsed = parseAvatarKey(key);
  if (!parsed || !isValidSeed(parsed.seed)) return new Response("invalid avatar", { status: 400 });
  return new Response(avatarSvg(parsed.seed, parsed.parts), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
