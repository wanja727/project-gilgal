import type { ChapterText } from "@/lib/bible/types";

/** 본문 영역 — 본문 도구·입력창이 "본문 보며 고르기"로 돌아올 자리 */
export const CHAPTER_TEXT_ID = "chapter-text";

/**
 * 장·절 구분 본문 (architecture 8.5). ChapterText 만 보고 렌더링하므로 Provider 와 무관하다.
 * 글자 크기·글꼴·굵기·줄 간격은 읽기 설정(ReaderSettingsButton)이 정하는 CSS 변수를 따른다(.reader-text).
 * highlights: 내 형광펜 절(ADR-035) — 처음부터 칠해 그려 깜빡이지 않게. 이후 긋고 지우기는 VerseTools 가 속성을 바꾼다.
 */
export function ChapterReader({ text, highlights = [] }: { text: ChapterText; highlights?: number[] }) {
  const hl = new Set(highlights);
  return (
    <article id={CHAPTER_TEXT_ID} className="scroll-mt-16 px-5 pt-[22px] pb-2">
      {text.source === "mock" && (
        <p className="mb-4 inline-block rounded-[8px] bg-soft px-2.5 py-1.5 text-caption font-semibold text-mute">
          Mock 본문 · 실제 성경 본문이 아닙니다
        </p>
      )}
      <div className="reader-text text-text">
        {text.sections.map((section, i) => (
          <section key={i}>
            {section.heading && (
              <h3 className="mt-2 mb-2 font-sans text-small font-bold tracking-wide text-mute">{section.heading}</h3>
            )}
            {/* 절마다 줄을 나누고 절 번호를 왼쪽 칸에 둔다 — 본문 줄이 번호 아래로 파고들지 않아 읽기 편하다 */}
            <ol>
              {section.verses.map((v) => (
                // data-verse: 누르면 본문 도구(형광펜·복사·나눔에 넣기)가 뜨고, 나눔 입력창이 열려 있으면 "장:절"이 들어간다
                <li
                  key={v.number}
                  data-verse={v.number}
                  data-hl={hl.has(v.number) ? "" : undefined}
                  className="mb-3 grid grid-cols-[26px_1fr]"
                >
                  {/* 절 번호 줄 높이 = 본문 한 줄 높이 → 글자 크기·줄 간격을 바꿔도 첫 줄 가운데에 맞는다. 고르면 동그라미가 칠해진다 */}
                  <span className="reader-num -ml-1 font-sans text-[11px] font-bold text-mid">
                    <span className="inline-grid h-5 min-w-5 place-items-center rounded-full px-1 align-middle leading-none transition-colors">
                      {v.number}
                    </span>
                  </span>
                  {/* 격자 칸은 블록이 되므로 글자는 안쪽 인라인 칸에 — 형광펜이 줄마다 글자에만 칠해지게 */}
                  <span>
                    <span className="verse-text">{v.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <p className="mt-2 border-t border-line pt-3 font-sans text-[11px] text-mid">{text.attribution}</p>
    </article>
  );
}
