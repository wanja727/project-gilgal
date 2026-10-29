"use server";

import { revalidatePath } from "next/cache";
import { changeAvatar, type ChangeAvatarResult } from "@/lib/data/avatar";
import { requireMember } from "@/lib/data/viewer";

/** 아바타 꾸미기 저장. 입력은 고른 부품과 (섞기로 바꿨다면) 새 seed 뿐이고 userId 는 세션에서 얻는다. */
export async function saveAvatarAction(input: { seed: string | null; parts: unknown }): Promise<ChangeAvatarResult> {
  const member = await requireMember();
  const result = await changeAvatar(member.userId, input);
  if (result.status === "saved") {
    revalidatePath("/");
    revalidatePath("/journey");
    revalidatePath("/me");
  }
  return result;
}
