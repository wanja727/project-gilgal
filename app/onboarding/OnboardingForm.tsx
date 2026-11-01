"use client";

import { useActionState, useState } from "react";
import { buttonClass } from "@/components/ui";
import { submitCell, submitRealName, type CellStepState, type NameStepState } from "./actions";

const inputClass =
  "h-[54px] w-full rounded-btn border border-line bg-surface px-4 text-body text-text placeholder:text-mid focus:border-main focus:outline-none";

export function OnboardingForm({ cells }: { cells: { id: number; name: string; personal: boolean }[] }) {
  const [nameState, nameAction, namePending] = useActionState<NameStepState, FormData>(submitRealName, {
    step: "name",
  });
  const [cellState, cellAction, cellPending] = useActionState<CellStepState, FormData>(submitCell, {});
  // 셀 선택 단계에서 "이름 다시 입력" 을 누르면 이름 단계로 돌아간다
  const [backToName, setBackToName] = useState(false);

  if (nameState.step === "cell" && !backToName) {
    return (
      <form action={cellAction} className="space-y-4">
        <p className="rounded-btn bg-soft px-4 py-3 text-center text-small leading-5 text-mute">
          {nameState.message}
        </p>
        <input type="hidden" name="realName" value={nameState.name} />
        <p className="text-center text-body text-text">
          <span className="font-semibold text-main">{nameState.name}</span> 님의 소속 셀
        </p>
        <select name="cellId" aria-label="소속 셀" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            소속 셀을 선택하세요
          </option>
          {cells
            .filter((c) => !c.personal)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          {/* 청년캠프 셀이 아닌 성도도 함께 걷는다(ADR-031) — "무소속" 대신 다른 공동체에서 개인으로 참여 */}
          {cells.some((c) => c.personal) && (
            <optgroup label="셀이 없다면">
              {cells
                .filter((c) => c.personal)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (셀 없이 개인으로 참여)
                  </option>
                ))}
            </optgroup>
          )}
        </select>
        {cellState.error && (
          <p role="alert" className="text-center text-caption text-main">
            {cellState.error}
          </p>
        )}
        <button type="submit" disabled={cellPending} className={buttonClass("main")}>
          {cellPending ? "저장 중…" : "여정 시작하기"}
        </button>
        <button
          type="button"
          onClick={() => setBackToName(true)}
          className="min-h-11 w-full text-center text-caption text-mute underline underline-offset-2"
        >
          이름 다시 입력하기
        </button>
        <p className="text-center text-[11px] leading-5 text-mute">
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
        aria-label="이름"
        placeholder="전체 이름 (예: 홍길동)"
        required
        minLength={2}
        maxLength={20}
        autoComplete="name"
        className={inputClass}
      />
      <p className="px-1 text-[11px] leading-5 text-mute">
        카카오 닉네임이 아니라, 성을 포함한 실제 이름을 적어 주세요.
      </p>
      {nameState.step === "name" && nameState.error && (
        <p role="alert" className="text-center text-caption text-main">
          {nameState.error}
        </p>
      )}
      <button type="submit" disabled={namePending} className={buttonClass("main")}>
        {namePending ? "확인 중…" : "확인"}
      </button>
    </form>
  );
}
