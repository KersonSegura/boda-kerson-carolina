interface SectionDividerProps {
  className?: string;
}

export function SectionDivider({ className = "" }: SectionDividerProps) {
  return (
    <div
      className={`mx-auto flex max-w-xs items-center gap-3 px-4 ${className}`}
      aria-hidden="true"
    >
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-beige-300 to-beige-200" />
      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-beige-300 to-beige-200" />
    </div>
  );
}
