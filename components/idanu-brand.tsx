import './idanu-brand.css'

export function IdanuBrand({ compact = false }: { compact?: boolean }) {
  return <span className={`idanu-brand${compact ? ' idanu-brand-compact' : ''}`} role="img" aria-label="Idanu">
    <span className="idanu-brand-i" aria-hidden="true">
      <svg className="idanu-brand-eye" viewBox="0 0 40 24" fill="none">
        <path d="M3 12C7 5 13 2 20 2s13 3 17 10c-4 7-10 10-17 10S7 19 3 12Z" stroke="currentColor" strokeWidth="2.4" />
        <circle className="idanu-brand-pupil" cx="20" cy="12" r="5.5" fill="currentColor" />
        <circle cx="22" cy="10" r="1.6" fill="var(--idanu-eye-glint, #fff)" />
      </svg>
      I
    </span><span aria-hidden="true">danu<span className="idanu-brand-period">.</span></span>
  </span>
}