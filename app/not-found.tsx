import { ButtonLink, EmptyState } from "@/components/ui";

/** 없는 주소 (예: /day/25) */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-gutter">
      <div className="rounded-card bg-surface">
        <EmptyState title="길을 찾을 수 없어요">주소가 바뀌었거나 없는 장이에요.</EmptyState>
      </div>
      <div className="mt-4">
        <ButtonLink href="/" variant="line">
          오늘의 여정으로
        </ButtonLink>
      </div>
    </main>
  );
}
