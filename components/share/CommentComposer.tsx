"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCommentAction } from "@/app/actions/comments";
import { buttonClass } from "@/components/ui";

const ERRORS: Record<string, string> = {
  invalid: "내용을 적어 주세요.",
  locked: "아직 열리지 않은 장이에요.",
  limit: "오늘은 나눔을 충분히 남겼어요. 내일 또 나눠 주세요.",
};

/** 나눔 쓰기 — 성경 해설이 아니라 읽고 마음에 남은 것을 나누는 자리 */
export function CommentComposer({ dayNo, maxLength }: { dayNo: number; maxLength: number }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await createCommentAction(dayNo, text);
        if (r.status === "ok") {
          setText("");
          router.refresh();
        } else setError(r.status === "too_long" ? `${maxLength}자까지 쓸 수 있어요.` : (ERRORS[r.status] ?? "남기지 못했어요."));
      } catch {
        setError("남기지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="mt-2 rounded-[20px] bg-surface p-4">
      <label htmlFor={`compose-${dayNo}`} className="text-small font-semibold text-main">
        {dayNo}장을 읽고 마음에 남은 것을 나눠 주세요
      </label>
      <textarea
        id={`compose-${dayNo}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={maxLength}
        rows={3}
        placeholder="한 문장이어도 좋아요"
        className="mt-2 w-full resize-none rounded-[12px] bg-bg p-3 text-[14.5px] leading-[1.65] text-text outline-none placeholder:text-mid focus-visible:outline-2 focus-visible:outline-main"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-caption whitespace-nowrap text-mid tabular-nums" aria-live="polite">
          {text.length} / {maxLength}
        </span>
        <button type="submit" disabled={pending || !text.trim()} className={buttonClass("main", "h-11 !w-auto shrink-0 px-5 text-body")}>
          {pending ? "남기는 중…" : "나눔 남기기"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-caption text-main">
          {error}
        </p>
      )}
    </form>
  );
}
