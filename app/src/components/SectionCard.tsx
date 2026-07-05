import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

interface Props {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  noPad?: boolean
}

export function SectionCard({ title, subtitle, children, className, noPad }: Props) {
  return (
    <div className={cn('bg-white rounded-card border border-cobalt/10', !noPad && 'p-5', className)}>
      {title && (
        <div className={cn('mb-4', noPad && 'px-5 pt-5')}>
          <p className="text-sm font-semibold text-cobalt-ink">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
