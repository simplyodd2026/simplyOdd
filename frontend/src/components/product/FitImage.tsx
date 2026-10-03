import { cn } from '@/lib/cn'

/**
 * Shows a whole 4:5 product shot in any frame shape: the shot is centred at full height on a quiet panel,
 * like a print hung on a wall, so wide frames never crop the object.
 */
export function FitImage({ src, alt, className, imgClassName, priority, inset = true, panel = 'bg-paper-2' }: {
  src?: string; alt: string; className?: string; imgClassName?: string; priority?: boolean; inset?: boolean; panel?: string
}) {
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden', panel, inset && 'p-[6%]', className)}>
      {src && (
        <div className="relative aspect-[4/5] h-full max-w-full overflow-hidden bg-ash">
          <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" draggable={false}
            className={cn('absolute inset-0 h-full w-full object-cover', imgClassName)} />
        </div>
      )}
    </div>
  )
}
