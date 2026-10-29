import { avatarUrl } from "@/lib/avatarSeed";

/**
 * 사용자 아바타. 아바타 키(seed + 꾸미기 부품, lib/avatarParts.ts)만 받고 이름·userId 는 받지 않는다.
 * 목록에서 여러 개를 쓸 때 브라우저 캐시를 타도록 SVG 를 인라인하지 않고 <img> 로 불러온다.
 * (인라인 SVG 를 여러 개 넣으면 DiceBear 내부 id 가 겹쳐 그림이 섞이는 문제도 피한다)
 */
export function Avatar({
  avatarKey,
  size = 32,
  dim = false,
  ring = true,
  className = "",
}: {
  avatarKey: string;
  size?: number;
  /** 아직 오늘 장까지 오지 않은 셀원 등 흐리게 표시 */
  dim?: boolean;
  /** 겹쳐 놓을 때 경계가 보이도록 바탕색 테두리 */
  ring?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 작은 SVG, 최적화 불필요
    <img
      src={avatarUrl(avatarKey)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={`shrink-0 rounded-full bg-surface ${ring ? "shadow-[0_0_0_2px_var(--color-surface)]" : ""} ${
        dim ? "opacity-30 grayscale" : ""
      } ${className}`}
    />
  );
}
