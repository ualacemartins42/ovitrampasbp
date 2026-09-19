import mosquitoMark from '@/assets/brand/mosquito-proibido.png'
import { cn } from '@/lib/utils'

type BrandMarkSize = 'sm' | 'lg'

const sizes: Record<BrandMarkSize, { box: string; img: number }> = {
  sm: { box: 'size-11 rounded-xl p-0', img: 44 },
  lg: { box: 'size-44 rounded-[2rem] p-2.5', img: 176 },
}

export function BrandMark({
  size = 'lg',
  className,
}: {
  size?: BrandMarkSize
  className?: string
}) {
  const spec = sizes[size]
  const large = size === 'lg'

  return (
    <div className={cn('relative mx-auto w-fit', large ? 'mb-1' : '', className)}>
      {large ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-4 rounded-full bg-[radial-gradient(circle,rgba(185,28,28,0.18)_0%,rgba(15,118,110,0.16)_45%,transparent_72%)]"
        />
      ) : null}
      <div
        className={cn(
          'relative overflow-hidden bg-white ring-1 ring-line',
          spec.box,
          large
            ? 'shadow-[0_18px_36px_-16px_rgba(185,28,28,0.4),0_10px_24px_-12px_rgba(15,118,110,0.35)]'
            : 'shadow-sm',
        )}
        aria-hidden={large ? undefined : true}
      >
        <img
          src={mosquitoMark}
          alt={large ? 'Símbolo de combate ao mosquito Aedes' : ''}
          width={spec.img}
          height={spec.img}
          className={cn('h-full w-full object-contain', large ? '' : 'scale-[1.28]')}
          decoding="async"
          draggable={false}
        />
      </div>
    </div>
  )
}
