import type { ChapterText } from "@/lib/bible/types";

/**
 * 장·절 구분 본문 (architecture 8.5). ChapterText 만 보고 렌더링하므로 Provider 와 무관하다.
 * 글자 크기·글꼴·굵기·줄 간격은 읽기 설정(ReaderSettingsButton)이 정하는 CSS 변수를 따른다(.reader-text).
 */
export function ChapterReader({ text }: { text: ChapterText }) {
  return (
    <article className="px-5 pt-[22px] pb-2">
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
                <li key={v.number} className="mb-3 grid grid-cols-[24px_1fr]">
                  {/* 절 번호 줄 높이 = 본문 한 줄 높이 → 글자 크기·줄 간격을 바꿔도 첫 줄 가운데에 맞는다 */}
                  <span className="reader-num font-sans text-[11px] font-bold text-mid">{v.number}</span>
                  <span>{v.text}</span>
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
