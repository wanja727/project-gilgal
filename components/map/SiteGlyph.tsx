import type { SiteId } from "@/lib/journey/locations";

/**
 * 장소 아이콘 (24×24, 선 아이콘). 디자인 시안 v5 의 간이 아이콘이다 —
 * 정식 일러스트가 나오면 이 파일의 경로만 바꾸면 지도·장소 카드·범례가 함께 바뀐다.
 */
const GLYPHS: Record<SiteId, React.ReactNode> = {
  shittim: (
    <>
      <path d="M2.5 19l5-9 5 9M11.5 19l5-9 5 9M7.5 10V7M16.5 10V7" />
      <path d="M1.5 19h21" />
    </>
  ),
  jordan: (
    <>
      <path d="M6 9h12v6H6zM3 11h18M9 9V7.5h6V9" />
      <path d="M3 19.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" />
    </>
  ),
  gilgal: (
    <>
      <ellipse cx="6" cy="18.5" rx="3" ry="2" />
      <ellipse cx="12" cy="18.5" rx="3" ry="2" />
      <ellipse cx="18" cy="18.5" rx="3" ry="2" />
      <ellipse cx="9" cy="14.3" rx="3" ry="2" />
      <ellipse cx="15" cy="14.3" rx="3" ry="2" />
      <ellipse cx="12" cy="10.1" rx="3" ry="2" />
      <path d="M12 8V4.5" />
    </>
  ),
  jericho: (
    <>
      <path d="M3 20V9h3V6.5h3V9h2V6.5h2V9h2V6.5h3V9h3v11" />
      <path d="M12.5 11.5l-2 3 2.2 1.6-1.4 3.9M2 20h20" />
    </>
  ),
  ai: (
    <>
      <path d="M3 19.5c1.5-4.5 4.5-8 9-8s7.5 3.5 9 8z" />
      <path d="M8 16.5h2M13 14.5h2M14.5 17.5h2M9.5 13.5h1.5" />
      <path d="M12 11.5V8M10 8.5c.8-1.5 3.2-1.5 4 0" />
    </>
  ),
  ebal: (
    <>
      <path d="M4.5 20V9a3 3 0 016 0v11zM13.5 20V9a3 3 0 016 0v11z" />
      <path d="M6.5 11h2M6.5 14h2M15.5 11h2M15.5 14h2M3 20h18" />
    </>
  ),
  gibeon: (
    <>
      <circle cx="8" cy="12" r="3.2" />
      <path d="M8 5.5v1.3M8 17.2v1.3M1.5 12h1.3M13.2 12h1.3M3.4 7.4l.9.9M11.7 15.7l.9.9M3.4 16.6l.9-.9M11.7 8.3l.9-.9" />
      <path d="M19.5 8.5a3.8 3.8 0 100 7 4.6 4.6 0 010-7z" />
    </>
  ),
  hazor: (
    <>
      <path d="M12 3c.7 3.6 5 5 5 10a5 5 0 01-10 0c0-2.6 1.7-3.7 1.9-5.6 1.1 1 1.8 2 2.6 2.1.2-2-.6-4.3.5-6.5z" />
      <path d="M4 21h16" />
    </>
  ),
  hebron: (
    <>
      <path d="M2.5 19.5l6.5-11 4 6.5 2.5-3.5 6 8z" />
      <path d="M7.5 11l1.5 1.3 1.4-1.1" />
    </>
  ),
  shiloh: (
    <>
      <path d="M3.5 19.5V11L12 6l8.5 5v8.5z" />
      <path d="M10 19.5V15h4v4.5M12 6V3.5M2.5 19.5h19" />
    </>
  ),
  shechem: (
    <>
      <path d="M5.5 20.5V9.5c0-2.2 1.3-3.5 3.3-3.5s3.2 1.3 3.2 3.5v11" />
      <path d="M17.5 20.5v-6" />
      <circle cx="17.5" cy="10.5" r="3.6" />
      <path d="M2.5 20.5h19" />
    </>
  ),
  east: (
    <>
      <path d="M5 20v-8h14v8M5 15.5h14M9.5 12v8M14.5 12v8" />
      <path d="M8 12V9.5h8V12M3 20h18" />
    </>
  ),
};

/** 지도 SVG 안에 넣는 아이콘 그룹 (부모가 위치·크기·색을 정한다) */
export function SiteGlyphPaths({ id }: { id: SiteId }) {
  return <>{GLYPHS[id]}</>;
}

/** HTML 안에 쓰는 독립 아이콘 (장소 카드·범례) */
export function SiteGlyph({ id, size = 24, strokeWidth = 1.8, className = "" }: {
  id: SiteId;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {GLYPHS[id]}
    </svg>
  );
}
