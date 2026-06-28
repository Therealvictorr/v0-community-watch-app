import Link from 'next/link'

interface BrandLogoProps {
  className?: string
  textClassName?: string
}

export function BrandLogo({ className = '', textClassName = 'text-lg' }: BrandLogoProps) {
  return (
    <Link href="/" className={`inline-flex items-center ${className}`} aria-label="SafeCircle home">
      <span className={`font-black tracking-[-0.06em] leading-none ${textClassName}`}>
        <span className="text-foreground">Safe</span>
        <span className="text-primary">Circle</span>
      </span>
    </Link>
  )
}
