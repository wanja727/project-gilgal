import { Avatar } from "@/components/Avatar";

/**
 * 아바타 머리 위 말풍선 한 개(ADR-028). 이름은 보이지 않는다 — 그 자리의 백성이 되어 쓰는 말이라서.
 * 내 한마디만 아바타 아래 "나"를 붙인다.
 */
export function NoteBubble({
  avatarKey,
  content,
  mine = false,
  hidden = false,
  className = "",
  style,
  children,
}: {
  avatarKey: string;
  content: string;
  mine?: boolean;
  /** 운영자가 숨긴 한마디(운영자·쓴 사람에게만 보임) */
  hidden?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** 아바타 아래 덧붙임(운영자 숨기기 버튼 등) */
  children?: React.ReactNode;
}) {
  return (
    <figure className={`flex max-w-[168px] min-w-[96px] shrink-0 flex-col items-center ${hidden ? "opacity-45" : ""} ${className}`} style={style}>
      <blockquote className="relative w-fit max-w-full rounded-[16px] bg-bg px-3 py-2.5 text-center text-[13px] leading-[1.45] font-medium text-text">
        {content}
        {/* 꼬리: 아래 아바타를 가리킨다 */}
        <span aria-hidden className="absolute -bottom-[5px] left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-[2px] bg-bg" />
      </blockquote>
      <figcaption className="mt-2.5 flex flex-col items-center gap-1">
        <Avatar avatarKey={avatarKey} size={40} />
        {mine && <span className="text-[11px] font-semibold text-mute">나</span>}
        {hidden && <span className="text-[11px] text-mute">숨김</span>}
        {children}
      </figcaption>
    </figure>
  );
}
