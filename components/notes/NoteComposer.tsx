"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTrailNoteAction, saveTrailNoteAction } from "@/app/actions/notes";
import { Avatar } from "@/components/Avatar";
import { TRAIL_NOTE_MAX_LENGTH } from "@/lib/share/note";
import { NoteBubble } from "./NoteBubble";

const ERRORS: Record<string, string> = {
  invalid: "한마디를 적어 주세요.",
  too_long: `${TRAIL_NOTE_MAX_LENGTH}자까지 쓸 수 있어요.`,
  locked: "아직 열리지 않은 장이에요.",
  not_arrived: "이 장을 읽고 도착하면 남길 수 있어요.",
};

/**
 * 뒤에 올 동행자에게 남기는 한마디(ADR-028) — 도착 화면과 홈에서 쓴다.
 * 내 아바타 옆 말풍선 모양 입력칸에 한 줄. 남기면 그 자리에 말풍선이 떠오르고, 고치거나 지울 수 있다.
 */
export function NoteComposer({
  dayNo,
  avatarKey,
  initial = null,
  className = "",
}: {
  dayNo: number;
  avatarKey: string;
  initial?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(initial);
  const [editing, setEditing] = useState(initial === null);
  const [text, setText] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await saveTrailNoteAction(dayNo, text);
        if (r.status === "ok") {
          setSaved(text.replace(/\s+/g, " ").trim());
          setEditing(false);
          router.refresh();
        } else setError(ERRORS[r.status] ?? "남기지 못했어요.");
      } catch {
        setError("남기지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  };

  const remove = () => {
    startTransition(async () => {
      try {
        const r = await deleteTrailNoteAction(dayNo);
        if (r.status === "ok" || r.status === "not_found") {
          setSaved(null);
          setText("");
          setEditing(true);
          router.refresh();
        }
      } catch {
        setError("지우지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  };

  if (saved !== null && !editing) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <p className="mb-3 text-caption font-semibold text-mute">뒤에 올 동행자에게 남긴 한마디</p>
        <NoteBubble avatarKey={avatarKey} content={saved} mine className="animate-[bubble-pop_.5s_var(--ease-sheet)_both]" />
        <div className="mt-1 flex text-caption text-mute">
          <button type="button" onClick={() => setEditing(true)} className="min-h-11 px-3">
            고치기
          </button>
          <button type="button" onClick={remove} disabled={pending} className="min-h-11 px-3">
            지우기
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className={className}>
      <label htmlFor={`note-${dayNo}`} className="block text-small font-semibold text-main">
        뒤에 올 동행자에게 한마디
      </label>
      <p className="mt-0.5 text-caption text-mute">그 자리에 있던 백성이 되어 남겨 보세요 · 이름 없이 보여요</p>
      <div className="mt-3 flex items-center gap-2.5">
        <Avatar avatarKey={avatarKey} size={40} />
        {/* 말풍선 모양 입력칸 — 꼬리가 내 아바타를 가리킨다 */}
        <div className="relative min-w-0 flex-1">
          <span aria-hidden className="absolute top-1/2 -left-[5px] size-3 -translate-y-1/2 rotate-45 rounded-[2px] bg-bg" />
          <input
            id={`note-${dayNo}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={TRAIL_NOTE_MAX_LENGTH}
            placeholder="먼저 와 있어요! 천천히 오세요"
            enterKeyHint="send"
            className="relative h-11 w-full rounded-[16px] bg-bg px-3.5 text-[14px] text-text outline-none placeholder:text-mid focus-visible:outline-2 focus-visible:outline-main"
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="pl-[50px] text-caption text-mid tabular-nums" aria-live="polite">
          {text.length} / {TRAIL_NOTE_MAX_LENGTH}
        </span>
        <span className="flex items-center gap-1">
          {saved !== null && (
            <button type="button" onClick={() => setEditing(false)} className="min-h-10 px-3 text-small text-mute">
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={pending || !text.trim()}
            className="h-10 rounded-[12px] bg-main px-4 text-small font-bold text-white disabled:opacity-40"
          >
            {pending ? "남기는 중…" : "남기기"}
          </button>
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-caption text-main">
          {error}
        </p>
      )}
    </form>
  );
}
