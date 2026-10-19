/**
 * 사용자 아바타. seed 만 받고 이름·userId 는 받지 않는다.
 * 목록에서 여러 개를 쓸 때 브라우저 캐시를 타도록 SVG 를 인라인하지 않고 <img> 로 불러온다.
 */
export function Avatar({
  seed,
  size = 32,
  dim = false,
  className = "",
}: {
  seed: string;
  size?: number;
  /** 아직 시작하지 않은 동행자 등 흐리게 표시 */
  dim?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 작은 SVG, 최적화 불필요
    <img
      src={`/api/avatar/${encodeURIComponent(seed)}`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={`shrink-0 rounded-full ${dim ? "opacity-35 grayscale" : ""} ${className}`}
    />
  );
}
