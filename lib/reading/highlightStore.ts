/**
 * 지금 보고 있는 장의 내 형광펜(ADR-035) — 본문 도구(VerseTools)와 나눔 입력창(ComposerDock)이 함께 본다.
 * 서버가 처음 값을 주고(VerseTools 가 채운다), 긋고 지울 때는 여기서 먼저 바꾼 뒤 서버에 저장한다(낙관적 반영).
 * 본문 화면에서만 채워지므로 다른 화면의 입력창에는 늘 비어 있다.
 */
type State = { chapter: number; verses: ReadonlySet<number> };

const EMPTY: State = { chapter: 0, verses: new Set() };
let state: State = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const highlightStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
  getServer: () => EMPTY,
  set(chapter: number, verses: Iterable<number>) {
    state = { chapter, verses: new Set(verses) };
    emit();
  },
  clear() {
    state = EMPTY;
    emit();
  },
};
