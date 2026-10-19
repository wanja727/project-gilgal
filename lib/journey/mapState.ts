import { JOURNEY_DAYS } from "./days";
import { LOCATIONS, START_LOCATION, type LocationId } from "./locations";

/**
 * 완료한 DAY 집합 → 지도 상태 (순수 함수, architecture 8.2).
 *
 * - 장소가 없는 장(12, 13, 15~17, 23)은 직전 지점에 머문다.
 * - 현재 위치 = 완료한 가장 큰 DAY 의 머무는 지점. 순서와 상관없이 완료할 수 있으므로
 *   "가장 최근에 완료한 것"이 아니라 "가장 멀리 간 DAY" 기준이다.
 * - 경로 구간은 DAY 순서대로 지점이 바뀌는 곳마다 하나. 그 DAY 를 완료하면 걸은 길(실선).
 */

export type MapLocationState = "start" | "visited" | "upcoming";

export type MapSegment = { day: number; from: LocationId; to: LocationId; walked: boolean };

export type MapState = {
  locations: { id: LocationId; state: MapLocationState }[];
  segments: MapSegment[];
  marker: LocationId;
  /** 오늘의 DAY 가 향하는 지점 (있으면 강조) */
  highlight: LocationId | null;
};

/** DAY d 를 마친 뒤 머무는 지점 (index 0 = 출발 전) */
const POSITION_AFTER_DAY: LocationId[] = (() => {
  const positions: LocationId[] = [START_LOCATION];
  for (const d of JOURNEY_DAYS) positions.push(d.locationId ?? positions[positions.length - 1]);
  return positions;
})();

const ROUTE: Omit<MapSegment, "walked">[] = JOURNEY_DAYS.flatMap((d) => {
  const from = POSITION_AFTER_DAY[d.day - 1];
  const to = POSITION_AFTER_DAY[d.day];
  return from === to ? [] : [{ day: d.day, from, to }];
});

export function positionAfterDay(day: number): LocationId {
  const pos = POSITION_AFTER_DAY[day];
  if (!pos) throw new Error(`잘못된 DAY: ${day}`);
  return pos;
}

export function mapState(completedDays: Iterable<number>, todayDayNo: number | null = null): MapState {
  const done = new Set(completedDays);
  const maxDone = Math.max(0, ...[...done].filter((d) => POSITION_AFTER_DAY[d] !== undefined));

  const visited = new Set<LocationId>();
  for (const d of JOURNEY_DAYS) {
    if (done.has(d.day) && d.locationId) visited.add(d.locationId);
  }

  const locations = (Object.keys(LOCATIONS) as LocationId[]).map((id) => ({
    id,
    state: (id === START_LOCATION ? "start" : visited.has(id) ? "visited" : "upcoming") as MapLocationState,
  }));

  const todayLocation = todayDayNo ? JOURNEY_DAYS[todayDayNo - 1]?.locationId : undefined;

  return {
    locations,
    segments: ROUTE.map((s) => ({ ...s, walked: done.has(s.day) })),
    marker: POSITION_AFTER_DAY[maxDone],
    highlight: todayLocation ?? null,
  };
}
