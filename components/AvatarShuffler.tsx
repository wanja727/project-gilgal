"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAvatarAction } from "@/app/(tabs)/me/actions";
import { randomAvatarSeed } from "@/lib/avatarSeed";
import { Avatar } from "./Avatar";
import { buttonClass } from "./ui";

/**
 * 내 아바타 섞기. 섞기는 미리보기만 하고, "이걸로 할게요"를 눌러야 저장된다 —
 * 마음에 드는 모양을 지나쳐도 저장 전이면 원래 아바타가 그대로 남는다.
 */
export function AvatarShuffler({ seed }: { seed: string }) {
  const router = useRouter();
  const [candidate, setCandidate] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shuffle = () => {
    setMessage(null);
    setCandidate(randomAvatarSeed());
  };

  const save = () => {
    if (!candidate) return;
    startTransition(async () => {
      try {
        const result = await saveAvatarAction(candidate);
        if (result.status === "saved") {
          setCandidate(null);
          setMessage("새 아바타로 바꿨어요");
          router.refresh();
        } else {
          // taken 은 랜덤 seed 가 우연히 겹친 경우 — 다른 후보로 바로 바꿔 준다
          setCandidate(randomAvatarSeed());
          setMessage("다른 모양으로 다시 골라 주세요");
        }
      } catch {
        setMessage("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
      }
    });
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar seed={candidate ?? seed} size={64} className={candidate ? "shadow-[0_0_0_2px_var(--color-surface),0_0_0_4px_var(--color-main)]" : ""} />
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-main">{candidate ? "이 모양은 어때요?" : "지금 아바타"}</p>
          <p className="mt-0.5 text-caption text-mute">
            {candidate ? "저장하기 전까지는 지금 아바타가 그대로예요" : "섞어서 새로운 모양을 만들 수 있어요"}
          </p>
        </div>
      </div>
      <div className={`mt-4 grid gap-2 ${candidate ? "grid-cols-3" : "grid-cols-1"}`}>
        {candidate && (
          <button
            type="button"
            onClick={() => {
              setCandidate(null);
              setMessage(null);
            }}
            disabled={pending}
            className={buttonClass("quiet", "h-12 text-body")}
          >
            취소
          </button>
        )}
        <button type="button" onClick={shuffle} disabled={pending} className={buttonClass("line", "h-12 text-body")}>
          {candidate ? "다시 섞기" : "아바타 섞기"}
        </button>
        {candidate && (
          <button type="button" onClick={save} disabled={pending} className={buttonClass("main", "h-12 text-body")}>
            {pending ? "저장 중…" : "이걸로 할게요"}
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="mt-2 text-center text-caption text-mute">
          {message}
        </p>
      )}
    </div>
  );
}
