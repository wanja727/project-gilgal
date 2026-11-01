"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteCommentAction, editCommentAction, setHiddenAction, setLikeAction } from "@/app/actions/comments";
import { Avatar } from "@/components/Avatar";
import type { SharedComment } from "@/lib/data/comments";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import { isJustPosted } from "@/lib/share/justPosted";
import { ComposerDock } from "./CommentComposer";
import { VerseRefText } from "./VerseRefText";

/** 나눔 한 개로 바로 가는 주소 조각 — 홈 말풍선이 이 나눔을 가리킬 때 */
export function shareAnchor(id: number) {
  return `share-${id}`;
}

/** 나눔 한 개: 작성자 · 내용 · 공감 · (내 나눔이면) 수정/삭제 · (운영자면) 숨김/복구 */
export function CommentCard({
  comment,
  isAdmin,
  maxLength,
  chapterLink,
  quoting = false,
}: {
  comment: SharedComment;
  isAdmin: boolean;
  maxLength: number;
  /** 나눔 탭에서 어느 장의 나눔인지 보여 줄 때 */
  chapterLink?: { href: string; label: string };
  /** 장 본문 화면이면 고칠 때도 절 누르기로 구절을 넣는다 */
  quoting?: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likes, setLikes] = useState(comment.likeCount);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // 방금 남긴 내 나눔이면 목록에 내려앉는 연출 — 처음 그릴 때 한 번만 정한다
  const [arriving] = useState(() => comment.mine && isJustPosted());
  // 홈 말풍선에서 눌러 왔으면(#share-<id>) 이 나눔을 가운데로 데려오고 한동안 물들여 "이거예요" 하고 알린다(2026-11-01).
  // 다시 그려지거나 새로고침해도 또 반짝이지 않게 주소는 #share 로 바꿔 둔다. 반짝임은 DOM 에 직접 — 그리기 상태와 무관
  const articleRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = articleRef.current;
    if (!el || window.location.hash !== `#${shareAnchor(comment.id)}`) return;
    el.scrollIntoView({ block: "center" });
    // 주소는 반짝임을 시작할 때 바꾼다 — 개발 모드에서 효과가 두 번 돌 때 첫 번째가 지워 버리지 않게
    const t = window.setTimeout(() => {
      history.replaceState(history.state, "", "#share");
      el.classList.add("share-focus");
      el.addEventListener("animationend", () => el.classList.remove("share-focus"), { once: true });
    }, 200);
    return () => window.clearTimeout(t);
  }, [comment.id]);
  const closeEdit = useCallback(() => {
    setEditing(false);
    setError(null);
  }, []);

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
    <article ref={articleRef} id={shareAnchor(comment.id)} className={`mt-2 rounded-[20px] bg-surface p-4 ${arriving ? "share-arrive" : ""}`}>
      <header className="flex items-center gap-2.5">
        <Avatar avatarKey={comment.author.avatarKey} size={32} />
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

      <VerseRefText content={comment.content} className="mt-2.5 text-[14.5px] leading-[1.65] whitespace-pre-line text-text" />

      {/* 고치기는 새 나눔과 같은 하단 입력창에서(구절 넣기·칩 포함, 2026-10-29) */}
      {editing && (
        <ComposerDock
          id={`edit-${comment.id}`}
          title="나눔 고치기"
          submitLabel="고친 나눔 저장"
          quoting={quoting}
          chapter={JOURNEY_DAYS[comment.dayNo - 1].chapter}
          maxLength={maxLength}
          text={draft}
          setText={setDraft}
          autoFocus
          pending={pending}
          error={error}
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) run(() => editCommentAction(comment.id, draft, comment.dayNo), () => setEditing(false));
          }}
          onClose={closeEdit}
        />
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
              <button
                type="button"
                onClick={() => {
                  setDraft(comment.content);
                  setEditing(true);
                }}
                className="min-h-11 px-2.5"
              >
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
      {error && !editing && (
        <p role="alert" className="mt-1 text-caption text-main">
          {error}
        </p>
      )}
    </article>
  );
}
