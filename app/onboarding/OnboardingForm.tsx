"use client";

import { useActionState, useState } from "react";
import { submitCell, submitRealName, type CellStepState, type NameStepState } from "./actions";

const inputClass =
  "w-full rounded-xl border border-line bg-card px-4 py-3.5 text-[15px] text-ink placeholder:text-stone/60 focus:border-olive focus:ring-2 focus:ring-olive/20 focus:outline-none";
const buttonClass =
  "w-full rounded-xl bg-olive py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50";

export function OnboardingForm({ cells }: { cells: { id: number; name: string }[] }) {
  const [nameState, nameAction, namePending] = useActionState<NameStepState, FormData>(submitRealName, {
    step: "name",
  });
  const [cellState, cellAction, cellPending] = useActionState<CellStepState, FormData>(submitCell, {});
  // 셀 선택 단계에서 "이름 다시 입력" 을 누르면 이름 단계로 돌아간다
  const [backToName, setBackToName] = useState(false);

  if (nameState.step === "cell" && !backToName) {
    return (
      <form action={cellAction} className="space-y-4">
        <p className="rounded-xl bg-paper-deep px-4 py-3 text-center text-[13px] leading-5 text-ink-soft">
          {nameState.message}
        </p>
        <input type="hidden" name="realName" value={nameState.name} />
        <p className="text-center text-sm">
          <span className="font-semibold">{nameState.name}</span> 님의 소속 셀
        </p>
        <select name="cellId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            소속 셀을 선택하세요
          </option>
          {cells.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {cellState.error && <p className="text-center text-xs text-clay">{cellState.error}</p>}
        <button type="submit" disabled={cellPending} className={buttonClass}>
          {cellPending ? "저장 중…" : "여정 시작하기"}
        </button>
        <button
          type="button"
          onClick={() => setBackToName(true)}
          className="w-full text-center text-xs text-stone underline underline-offset-2"
        >
          이름 다시 입력하기
        </button>
        <p className="text-center text-[11px] leading-5 text-stone">
          셀 정보가 잘못되었다면 운영자에게 알려 주세요. 운영자가 바로잡아 드려요.
        </p>
      </form>
    );
  }

  return (
    <form
      action={(fd) => {
        setBackToName(false);
        nameAction(fd);
      }}
      className="space-y-4"
    >
      <input
        name="realName"
        type="text"
        placeholder="전체 이름 (예: 홍길동)"
        required
        minLength={2}
        maxLength={20}
        autoComplete="name"
        className={inputClass}
      />
      <p className="px-1 text-[11px] leading-5 text-stone">
        카카오 닉네임이 아니라, 성을 포함한 실제 이름을 적어 주세요.
      </p>
      {nameState.step === "name" && nameState.error && (
        <p className="text-center text-xs text-clay">{nameState.error}</p>
      )}
      <button type="submit" disabled={namePending} className={buttonClass}>
        {namePending ? "확인 중…" : "확인"}
      </button>
    </form>
  );
}
