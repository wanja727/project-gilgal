"use server";

import { revalidatePath } from "next/cache";
import { changeAvatarSeed, type ChangeAvatarResult } from "@/lib/data/avatar";
import { requireMember } from "@/lib/data/viewer";

/** 아바타 섞기 저장. 입력은 seed 하나뿐이고 userId 는 세션에서 얻는다. */
export async function saveAvatarAction(seed: string): Promise<ChangeAvatarResult> {
  const member = await requireMember();
  const result = await changeAvatarSeed(member.userId, seed);
  if (result.status === "saved") {
    revalidatePath("/");
    revalidatePath("/journey");
  }
  return result;
}
