import { Avatar } from "@/components/Avatar";
import { Card, CardHead } from "@/components/ui";
import type { CellMember } from "@/lib/data/progress";

/**
 * 우리 셀: 기준 장까지 온 셀원은 선명하게, 아직인 셀원은 흐리게. 이름은 모두 성까지 보인다(2026-10-26).
 * (2026-10-26 운영자 변경 — 이전엔 아직인 셀원은 이름 없이 흐린 아바타만. 같은 셀끼리 서로 알아보고 격려하게)
 */
export function CellCard({
  cellName,
  members,
  note,
  showCount = true,
}: {
  cellName: string;
  members: CellMember[];
  note: string;
  /** 기간 전에는 도착 수 대신 인원만 */
  showCount?: boolean;
}) {
  const arrived = members.filter((m) => m.arrived).length;
  return (
    <Card aria-labelledby="cell-title">
      <CardHead
        id="cell-title"
        title={cellName}
        sub={showCount ? `${arrived} / ${members.length}` : `${members.length}명`}
      />
      <ul className="mt-4 grid grid-cols-6 justify-items-center gap-x-1.5 gap-y-2.5">
        {members.map((m, i) => {
          const clear = m.arrived || !showCount;
          return (
            <li
              key={i}
              className={`flex w-full flex-col items-center gap-[5px] text-[11px] ${clear ? "font-semibold text-main" : "text-mute"}`}
            >
              <Avatar seed={m.avatarSeed} size={38} dim={!clear} />
              <span className="max-w-full truncate">
                {m.isMe ? "나" : m.name ? m.name : <span className="sr-only">{showCount ? "아직 가는 중인 셀원" : "셀원"}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3.5 text-[12.5px] text-mute">{note}</p>
    </Card>
  );
}
