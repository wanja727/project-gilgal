"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAvatarAction } from "@/app/(tabs)/me/actions";
import {
  AVATAR_COLOR_COUNT,
  AVATAR_PARTS,
  type AvatarPartId,
  type AvatarParts,
  encodeAvatarKey,
  NONE,
  randomAvatarParts,
} from "@/lib/avatarParts";
import { randomAvatarSeed } from "@/lib/avatarSeed";
import { Avatar } from "./Avatar";
import { buttonClass } from "./ui";

type Tab = AvatarPartId | "color";

const TABS: { id: Tab; label: string }[] = [...AVATAR_PARTS.map((p) => ({ id: p.id, label: p.label })), { id: "color", label: "색" }];

/**
 * 내 아바타 꾸미기(ADR-027). 부위별로 고르면 바로 미리 보고, "이걸로 할게요"를 눌러야 저장된다 —
 * 저장 전이면 원래 아바타가 그대로 남는다. 보기 칸은 "지금 모양에서 그 부위만 바꾼 모습"이라 고르기 전에 결과를 본다.
 * 섞기는 부위·무늬를 모두 새로 뽑고, 색 탭의 "무늬 바꾸기"는 고른 부위는 두고 구슬 무늬(seed)만 바꾼다.
 */
export function AvatarEditor({ seed: savedSeed, parts: savedParts }: { seed: string; parts: AvatarParts }) {
  const router = useRouter();
  const [seed, setSeed] = useState(savedSeed);
  const [parts, setParts] = useState(savedParts);
  const [tab, setTab] = useState<Tab>("top");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = seed !== savedSeed || encodeAvatarKey(seed, parts) !== encodeAvatarKey(savedSeed, savedParts);
  const keyWith = (change: Partial<AvatarParts>) => encodeAvatarKey(seed, { ...parts, ...change });

  const change = (next: Partial<AvatarParts>) => {
    setMessage(null);
    setParts((p) => ({ ...p, ...next }));
  };
  const reset = () => {
    setSeed(savedSeed);
    setParts(savedParts);
    setMessage(null);
  };

  const save = () => {
    startTransition(async () => {
      try {
        const result = await saveAvatarAction({ seed: seed === savedSeed ? null : seed, parts });
        if (result.status === "saved") {
          setMessage("새 아바타로 바꿨어요");
          router.refresh();
        } else if (result.status === "taken") {
          // 랜덤 seed 가 우연히 겹친 경우 — 무늬만 다른 후보로 바꿔 준다
          setSeed(randomAvatarSeed());
          setMessage("무늬가 겹쳐서 다른 무늬로 바꿨어요. 한 번 더 저장해 주세요");
        } else {
          setMessage("저장하지 못했어요. 다시 골라 주세요");
        }
      } catch {
        setMessage("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
      }
    });
  };

  const part = AVATAR_PARTS.find((p) => p.id === tab);
  const choices =
    tab === "color"
      ? Array.from({ length: AVATAR_COLOR_COUNT }, (_, i) => ({
          key: String(i),
          label: `색 ${i + 1}`,
          selected: parts.color === i,
          avatarKey: keyWith({ color: i }),
          pick: () => change({ color: i }),
        }))
      : [...(part!.optional ? [{ id: NONE, label: "없음" }] : []), ...part!.options].map((o) => ({
          key: o.id,
          label: o.label,
          selected: parts[part!.id] === o.id,
          avatarKey: keyWith({ [part!.id]: o.id }),
          pick: () => change({ [part!.id]: o.id }),
        }));

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar
          avatarKey={encodeAvatarKey(seed, parts)}
          size={72}
          className={dirty ? "shadow-[0_0_0_2px_var(--color-surface),0_0_0_4px_var(--color-main)]" : ""}
        />
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-main">{dirty ? "이 모양은 어때요?" : "지금 아바타"}</p>
          <p className="mt-0.5 text-caption text-mute">
            {dirty ? "저장하기 전까지는 지금 아바타가 그대로예요" : "머리·모자, 눈, 안경을 골라 나를 닮게 꾸며 보세요"}
          </p>
        </div>
      </div>

      <div className={`mt-4 grid gap-2 ${dirty ? "grid-cols-3" : "grid-cols-1"}`}>
        {dirty && (
          <button type="button" onClick={reset} disabled={pending} className={buttonClass("quiet", "h-12 text-body")}>
            되돌리기
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setSeed(randomAvatarSeed());
            setParts(randomAvatarParts());
          }}
          disabled={pending}
          className={buttonClass("line", "h-12 text-body")}
        >
          {dirty ? "섞기" : "아무렇게나 섞기"}
        </button>
        {dirty && (
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

      <div role="tablist" aria-label="꾸밀 부위" className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`avatar-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="avatar-choices"
            onClick={() => setTab(t.id)}
            className={`h-9 shrink-0 rounded-chip px-3 text-small font-semibold ${
              tab === t.id ? "bg-main text-white" : "bg-soft text-mute"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        id="avatar-choices"
        role="tabpanel"
        aria-labelledby={`avatar-tab-${tab}`}
        className="mt-3 grid grid-cols-5 gap-x-1 gap-y-1.5"
      >
        {choices.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={c.selected}
            onClick={c.pick}
            className={`flex flex-col items-center gap-1 rounded-tile px-0.5 py-1.5 ${c.selected ? "bg-soft" : ""}`}
          >
            <Avatar
              avatarKey={c.avatarKey}
              size={46}
              ring={false}
              className={c.selected ? "shadow-[0_0_0_2px_var(--color-main)]" : ""}
            />
            <span className={`text-[11.5px] leading-tight ${c.selected ? "font-semibold text-main" : "text-mute"}`}>{c.label}</span>
          </button>
        ))}
      </div>
      {tab === "color" && (
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setSeed(randomAvatarSeed());
          }}
          className="mt-2 min-h-11 w-full text-small font-semibold text-mute underline underline-offset-4"
        >
          구슬 무늬 바꾸기
        </button>
      )}

    </div>
  );
}
