import { Avatar } from "@/components/Avatar";
import { Card, CardHead } from "@/components/ui";
import type { ArrivalBoard as Board } from "@/lib/data/progress";
import { formatKstTime, ordinalEn } from "@/lib/format";

/**
 * "오늘 N장까지 읽은 사람" — 완료 시각 순 1st/2nd/3rd, 4번째부터는 아바타 몇 개와 인원수,
 * 맨 아래에는 내 줄(도착 전/후). 아직 읽지 않은 사람의 명단은 보여 주지 않는다.
 */
export function ArrivalBoard({
  board,
  title,
  avatarSeed,
  position,
  remaining,
}: {
  board: Board;
  title: string;
  avatarSeed: string;
  position: number;
  /** 깃발까지 남은 장 */
  remaining: number;
}) {
  const rest = board.total - board.podium.length;
  return (
    <Card aria-labelledby="arrival-title">
      <CardHead id="arrival-title" title={title} right={<span className="text-small font-semibold text-mute">{board.total}명</span>} />

      {board.total === 0 ? (
        <p className="mt-4 text-small leading-6 text-mute">아직 도착한 동행자가 없어요. 오늘의 첫 걸음을 내디뎌 보세요.</p>
      ) : (
        <ol className="mt-2.5">
          {board.podium.map((a, i) => (
            <li key={i} className="grid grid-cols-[34px_40px_1fr_auto] items-center gap-3 py-[9px]">
              <span className="text-small font-extrabold tracking-[-0.01em] text-main">{ordinalEn(i + 1)}</span>
              <Avatar seed={a.avatarSeed} size={40} />
              <span className="min-w-0 text-body font-semibold text-main">
                {a.name}
                {a.cellName && <small className="mt-0.5 block text-caption font-medium text-mute">{a.cellName}</small>}
              </span>
              <time className="text-small text-mute tabular-nums">{formatKstTime(a.at)}</time>
            </li>
          ))}
        </ol>
      )}

      {rest > 0 && (
        <div className="mt-1.5 flex items-center gap-2.5 border-t border-soft pt-3.5 pb-0.5">
          <span className="flex" aria-hidden>
            {board.restAvatars.map((seed, i) => (
              <Avatar key={i} seed={seed} size={28} className={i ? "-ml-2" : ""} />
            ))}
          </span>
          <span className="text-small text-mute">4번째부터 {rest}명이 도착했어요</span>
        </div>
      )}

      {board.mine ? (
        <div className="-mx-2.5 mt-3 grid grid-cols-[34px_40px_1fr_auto] items-center gap-3 rounded-btn bg-soft px-2.5 py-3">
          <span className="text-small font-extrabold text-main">{ordinalEn(board.mine.rank)}</span>
          <Avatar seed={avatarSeed} size={40} />
          <span className="text-body font-semibold text-main">
            나<small className="mt-0.5 block text-caption font-medium text-mute">{board.mine.rank}번째로 도착</small>
          </span>
          <time className="text-small font-bold text-main tabular-nums">{formatKstTime(board.mine.at)}</time>
        </div>
      ) : (
        <div className="-mx-2.5 mt-3 grid grid-cols-[34px_40px_1fr_auto] items-center gap-3 rounded-btn bg-bg px-2.5 py-3">
          <span className="text-small font-extrabold text-mid">나</span>
          <Avatar seed={avatarSeed} size={40} dim />
          <span className="text-body font-semibold text-main">
            아직 가는 중
            <small className="mt-0.5 block text-caption font-medium text-mute">
              {position > 0 ? `지금 ${position}장` : "아직 출발 전"}, 깃발까지 {remaining}장
            </small>
          </span>
          <span />
        </div>
      )}
    </Card>
  );
}
