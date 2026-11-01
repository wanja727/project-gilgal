import { Avatar } from "@/components/Avatar";
import { InView } from "@/components/motion/InView";
import { Card, CardHead } from "@/components/ui";
import type { CellMember } from "@/lib/data/progress";
import { ReadRatio } from "./ReadRatio";

/**
 * 우리 셀: 기준 장까지 온 셀원은 선명하게, 아직인 셀원은 흐리게. 이름은 모두 성까지 보인다(2026-10-26).
 * (2026-10-26 운영자 변경 — 이전엔 아직인 셀원은 이름 없이 흐린 아바타만. 같은 셀끼리 서로 알아보고 격려하게)
 */
/** 홈 오른쪽 위 셀 이름(CellChip)이 이 카드로 스크롤한다 */
export const CELL_CARD_ID = "cell";

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
    <Card id={CELL_CARD_ID} aria-labelledby="cell-title" className="scroll-mt-4">
      <CardHead
        id="cell-title"
        title={cellName}
        // 오늘 본문을 읽은 셀원 / 셀 인원 · % (기간 전에는 인원만)
        sub={showCount ? undefined : `${members.length}명`}
        right={showCount ? <ReadRatio read={arrived} total={members.length} /> : undefined}
      />
      {/* 화면에 들어오면 막대가 차오르고, 도착한 셀원이 차례로 톡 떠오른다(2026-10-30) */}
      <InView>
        {showCount && members.length > 0 && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-soft" aria-hidden>
            <div
              className="cell-bar h-full rounded-full bg-main"
              style={{ "--pct": `${(arrived / members.length) * 100}%` } as React.CSSProperties}
            />
          </div>
        )}
        <ul className="mt-4 grid grid-cols-6 justify-items-center gap-x-1.5 gap-y-2.5">
          {members.map((m, i) => {
            const clear = m.arrived || !showCount;
            const order = showCount && m.arrived ? members.slice(0, i).filter((x) => x.arrived).length : -1;
            return (
              <li
                key={i}
                className={`flex w-full flex-col items-center gap-[5px] text-[11px] ${clear ? "font-semibold text-main" : "text-mute"}`}
              >
                <span
                  className={order >= 0 ? "cell-pop rounded-full" : undefined}
                  style={order >= 0 ? ({ "--d": `${200 + order * 70}ms` } as React.CSSProperties) : undefined}
                >
                  <Avatar avatarKey={m.avatarKey} size={38} dim={!clear} />
                </span>
                <span className="max-w-full truncate">
                  {m.isMe ? "나" : m.name ? m.name : <span className="sr-only">{showCount ? "아직 가는 중인 셀원" : "셀원"}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </InView>
      <p className="mt-3.5 text-[12.5px] text-mute">{note}</p>
    </Card>
  );
}
