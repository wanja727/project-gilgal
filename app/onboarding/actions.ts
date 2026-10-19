"use server";

import { redirect } from "next/navigation";
import { claimByRealName, selectCellManually } from "@/lib/data/onboarding";
import { requireViewer } from "@/lib/data/viewer";

export type NameStepState =
  | { step: "name"; error?: string }
  | { step: "cell"; name: string; message: string };

const NEED_CELL_MESSAGES = {
  not_found: "명단에서 이름을 찾지 못했어요. 소속 셀을 직접 선택해 주세요.",
  ambiguous: "같은 이름이 여러 명단에 있어 자동으로 연결할 수 없어요. 소속 셀을 직접 선택해 주세요.",
  too_many_attempts: "이름 확인을 여러 번 시도했어요. 소속 셀을 직접 선택해 주세요.",
} as const;

/** 2단계: 실명 매칭. userId 는 세션에서만 얻는다. */
export async function submitRealName(_prev: NameStepState, formData: FormData): Promise<NameStepState> {
  const viewer = await requireViewer();
  if (viewer.onboarded) redirect("/");

  const result = await claimByRealName(viewer.userId, String(formData.get("realName") ?? ""));
  switch (result.status) {
    case "matched":
    case "already_done":
      redirect("/");
    case "invalid_name":
      return { step: "name", error: "성을 포함한 전체 이름을 한글 또는 영문으로 입력해 주세요. (예: 홍길동)" };
    case "need_cell":
      return { step: "cell", name: result.name, message: NEED_CELL_MESSAGES[result.reason] };
  }
}

export type CellStepState = { error?: string };

/** 3단계: 기존 셀 목록에서 선택 */
export async function submitCell(_prev: CellStepState, formData: FormData): Promise<CellStepState> {
  const viewer = await requireViewer();
  if (viewer.onboarded) redirect("/");

  const result = await selectCellManually(
    viewer.userId,
    String(formData.get("realName") ?? ""),
    formData.get("cellId"),
  );
  switch (result.status) {
    case "ok":
    case "already_done":
      redirect("/");
    case "invalid_name":
      return { error: "이름을 다시 확인해 주세요." };
    case "invalid_cell":
      return { error: "목록에서 소속 셀을 선택해 주세요." };
  }
}
