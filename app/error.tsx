"use client";

import { useEffect } from "react";
import { buttonClass, EmptyState } from "@/components/ui";

/** 화면을 그리다 서버 오류가 났을 때 (DB 연결 실패 등) — 다시 시도할 수 있게 한다 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col justify-center px-gutter">
      <div role="alert" className="rounded-card bg-surface">
        <EmptyState title="잠시 길이 막혔어요">
          화면을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          {error.digest && <span className="mt-2 block text-[11px] text-mid">오류 코드 {error.digest}</span>}
        </EmptyState>
      </div>
      <div className="mt-4">
        <button type="button" onClick={reset} className={buttonClass("main")}>
          다시 시도
        </button>
      </div>
    </main>
  );
}
