import Link from "next/link";

/**
 * 공통 UI 조각 — 디자인 시안 v5 의 카드·버튼·제목 규칙을 한곳에 모은다.
 * 색·모서리·글자 크기는 globals.css 의 토큰만 쓴다.
 */

export type ButtonVariant = "main" | "quiet" | "line";

const BUTTON_BASE =
  "flex h-[54px] w-full items-center justify-center gap-1.5 rounded-btn text-title font-bold tracking-[-0.02em] transition active:scale-[0.985] disabled:active:scale-100";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  main: "bg-main text-white disabled:opacity-60",
  quiet: "bg-soft text-mute",
  line: "bg-surface text-main shadow-[inset_0_0_0_1px_var(--color-line)]",
};

export function buttonClass(variant: ButtonVariant = "main", extra = ""): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${extra}`;
}

export function ButtonLink({
  href,
  variant = "main",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

export function Card({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`mx-gutter mt-3 rounded-card bg-surface p-5 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHead({
  title,
  sub,
  right,
  id,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 id={id} className="text-title font-bold tracking-[-0.03em] text-main">
        {title}
        {sub !== undefined && <span className="ml-1.5 text-small font-medium text-mute">{sub}</span>}
      </h3>
      {right}
    </div>
  );
}

export function ChevronRight({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronLeft({ className = "size-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className={className}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function CloseIcon({ className = "size-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function FlagIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M6 21V4" />
      <path d="M6 4h11l-2.5 4 2.5 4H6z" fill="currentColor" />
    </svg>
  );
}

export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-mr-2 inline-flex min-h-11 items-center gap-0.5 px-2 text-small font-semibold text-mute">
      {children}
      <ChevronRight />
    </Link>
  );
}

/** 탭 화면 상단 제목 */
export function PageTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5">
      <h1 className="font-serif text-h1 font-bold tracking-[-0.04em] text-main">{children}</h1>
      {right}
    </div>
  );
}

/** 빈 상태 */
export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="font-serif text-title font-bold text-main">{title}</p>
      {children && <div className="mt-2 text-small leading-6 text-mute">{children}</div>}
    </div>
  );
}
