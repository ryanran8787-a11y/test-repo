export function ForgeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3" y="3" width="11" height="11" rx="1.5" fill="currentColor" />
      <rect x="10" y="10" width="11" height="11" rx="1.5" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
