import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Avatar } from "./Avatar";

/** 공통 상단 바: 서비스명(홈) · 여정 · 내 아바타 */
export function AppHeader({ avatarSeed, name }: { avatarSeed: string; name: string }) {
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-2">
      <Link href="/" className="font-serif text-xl font-semibold text-olive-deep">
        {BRAND.name}
      </Link>
      <nav className="flex items-center gap-4 text-[13px] text-ink-soft">
        <Link href="/journey" className="hover:text-ink">
          나의 여정
        </Link>
        <Link href="/journey" aria-label={`${name}님의 여정`}>
          <Avatar seed={avatarSeed} size={30} />
        </Link>
      </nav>
    </header>
  );
}
