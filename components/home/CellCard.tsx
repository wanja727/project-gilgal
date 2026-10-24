import { Avatar } from "@/components/Avatar";
import { Card, CardHead } from "@/components/ui";
import type { CellMember } from "@/lib/data/progress";
import { givenName } from "@/lib/format";

/**
 * 우리 셀: 기준 장까지 온 셀원은 선명하게(이름 표시), 아직인 셀원은 흐리게(이름 없음).
 * 이름 없는 흐린 아바타로 "미완료자 명단"처럼 보이지 않게 한다(요구사항 10절, 2026-10-24 결정).
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
                {m.isMe ? "나" : m.name ? givenName(m.name) : <span className="sr-only">{showCount ? "아직 가는 중인 셀원" : "셀원"}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3.5 text-[12.5px] text-mute">{note}</p>
    </Card>
  );
}
