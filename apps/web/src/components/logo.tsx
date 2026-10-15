/** A sheet of paper with a check mark: a document that has been read and verified */
export function Logo({ className = 'size-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="2.5" width="16" height="19" rx="3" className="fill-accent" />
      <path d="M8 7.5h8M8 11h5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="m9 16 2 2 4-4.5" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
