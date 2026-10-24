"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCommentAction, editCommentAction, setHiddenAction, setLikeAction } from "@/app/actions/comments";
import { Avatar } from "@/components/Avatar";
import type { SharedComment } from "@/lib/data/comments";

/** 나눔 한 개: 작성자 · 내용 · 공감 · (내 나눔이면) 수정/삭제 · (운영자면) 숨김/복구 */
export function CommentCard({
  comment,
  isAdmin,
  maxLength,
  chapterLink,
}: {
  comment: SharedComment;
  isAdmin: boolean;
  maxLength: number;
  /** 나눔 탭에서 어느 장의 나눔인지 보여 줄 때 */
  chapterLink?: { href: string; label: string };
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likes, setLikes] = useState(comment.likeCount);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleLike = () => {
    const next = !liked;
    // 낙관적 반영 → 서버 결과로 맞춘다
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    startTransition(async () => {
      try {
        const r = await setLikeAction(comment.id, next);
        if (r.status === "ok") {
          setLiked(r.liked);
          setLikes(r.likeCount);
        } else {
          setLiked(!next);
          setLikes((n) => n + (next ? -1 : 1));
        }
      } catch {
        setLiked(!next);
        setLikes((n) => n + (next ? -1 : 1));
      }
    });
  };

  const run = (fn: () => Promise<{ status: string }>, onOk?: () => void) => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await fn();
        if (r.status === "ok") {
          onOk?.();
          router.refresh();
        } else setError(r.status === "too_long" ? `${maxLength}자까지 쓸 수 있어요.` : "처리하지 못했어요. 다시 시도해 주세요.");
      } catch {
        setError("처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  };

  return (
    <article className="mt-2 rounded-[20px] bg-surface p-4">
      <header className="flex items-center gap-2.5">
        <Avatar seed={comment.author.avatarSeed} size={32} />
        <div className="min-w-0 flex-1 text-[14px] font-semibold text-main">
          {comment.author.name}
          <small className="mt-0.5 block text-caption font-medium text-mute">
            {[comment.author.cellName, comment.timeLabel].filter(Boolean).join(", ")}
            {comment.edited && " · 수정됨"}
          </small>
        </div>
        {chapterLink && (
          <Link href={chapterLink.href} className="shrink-0 rounded-chip bg-soft px-2.5 py-1 text-caption font-bold text-main">
            {chapterLink.label}
          </Link>
        )}
      </header>

      {comment.hidden && (
        <p className="mt-3 rounded-[10px] bg-bg px-3 py-2 text-caption text-mute">
          {isAdmin ? "숨김 처리된 나눔이에요 (운영자에게만 보여요)" : "운영자에 의해 숨겨진 나눔이에요. 다른 사람에게는 보이지 않아요."}
        </p>
      )}

      {editing ? (
        <div className="mt-2.5">
          <label className="sr-only" htmlFor={`edit-${comment.id}`}>
            나눔 고치기
          </label>
          <textarea
            id={`edit-${comment.id}`}
            value={draft}
            maxLength={maxLength}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-[12px] bg-bg p-3 text-[14.5px] leading-[1.65] text-text outline-none focus-visible:outline-2 focus-visible:outline-main"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="min-h-11 px-3 text-small text-mute">
              취소
            </button>
            <button
              type="button"
              disabled={pending || !draft.trim()}
              onClick={() => run(() => editCommentAction(comment.id, draft, comment.dayNo), () => setEditing(false))}
              className="min-h-11 rounded-[12px] bg-main px-4 text-small font-bold text-white disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2.5 text-[14.5px] leading-[1.65] whitespace-pre-line text-text">{comment.content}</p>
      )}

      <footer className="mt-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={toggleLike}
          disabled={comment.hidden}
          aria-pressed={liked}
          aria-label={`공감 ${likes}`}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-chip py-1.5 pr-3 pl-2.5 text-[12.5px] font-semibold disabled:opacity-50 ${
            liked ? "bg-soft text-main" : "bg-bg text-mute"
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-[15px]" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
          </svg>
          <b>{likes}</b>
        </button>

        <div className="flex items-center text-caption text-mute">
          {comment.mine && !editing && (
            <>
              <button type="button" onClick={() => setEditing(true)} className="min-h-11 px-2.5">
                수정
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("이 나눔을 지울까요?")) run(() => deleteCommentAction(comment.id, comment.dayNo));
                }}
                className="min-h-11 px-2.5"
              >
                삭제
              </button>
            </>
          )}
          {isAdmin && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setHiddenAction(comment.id, !comment.hidden, comment.dayNo))}
              className="min-h-11 px-2.5 font-semibold text-main"
            >
              {comment.hidden ? "복구" : "숨기기"}
            </button>
          )}
        </div>
      </footer>
      {error && (
        <p role="alert" className="mt-1 text-caption text-main">
          {error}
        </p>
      )}
    </article>
  );
}
