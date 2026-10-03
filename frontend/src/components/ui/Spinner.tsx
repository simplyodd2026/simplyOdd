export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** A slim loading readout: a bar that sweeps like a print head. */
export function PageSpinner() {
  return (
    <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-3">
        <div className="h-px w-32 overflow-hidden bg-rule">
          <div className="h-full w-1/3 bg-ink" style={{ animation: 'so-sweep 1.1s var(--ease-in-out-quart) infinite alternate' }} />
        </div>
        <span className="label text-fog">Loading</span>
      </div>
      <style>{'@keyframes so-sweep{from{transform:translateX(-100%)}to{transform:translateX(300%)}}'}</style>
    </div>
  )
}
