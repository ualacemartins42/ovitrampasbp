import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { cn, foldSearchText } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  selectedLabel?: string
  searchText?: string
}

export interface ComboboxGroup {
  label: string
  options: ComboboxOption[]
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  groups: ComboboxGroup[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  name?: string
  required?: boolean
  id?: string
  className?: string
}

export function Combobox({
  value,
  onChange,
  groups,
  placeholder = 'Selecione',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Nenhum resultado.',
  disabled,
  name,
  required,
  id,
  className,
}: ComboboxProps) {
  const listId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const selected = useMemo(
    () => groups.flatMap((group) => group.options).find((option) => option.value === value) ?? null,
    [groups, value],
  )

  const filtered = useMemo(() => {
    const needle = foldSearchText(query)
    return groups
      .map((group) => ({
        label: group.label,
        options: group.options.filter((option) => {
          if (!needle) return true
        return foldSearchText(`${option.label} ${option.searchText ?? ''}`).includes(needle)
        }),
      }))
      .filter((group) => group.options.length > 0)
  }, [groups, query])

  const flatOptions = useMemo(() => filtered.flatMap((group) => group.options), [filtered])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus())
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function close() {
    setOpen(false)
    setQuery('')
  }

  function selectOption(next: string) {
    onChange(next)
    close()
  }

  function clearField() {
    if (query) {
      setQuery('')
      setActiveIndex(0)
      searchRef.current?.focus()
      return
    }
    onChange('')
    setQuery('')
    setActiveIndex(0)
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, Math.max(flatOptions.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const option = flatOptions[activeIndex]
      if (option) selectOption(option.value)
    }
  }

  return (
    <div className={cn('relative', className)}>
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            'flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-white py-2 pl-3 pr-10 text-left text-ink',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            disabled && 'opacity-50',
          )}
          onClick={() => setOpen(true)}
        >
          <Search className="size-4 shrink-0 text-muted" />
          <span className={cn('min-w-0 flex-1 truncate text-sm', selected ? 'text-ink' : 'text-muted')}>
            {selected ? (selected.selectedLabel ?? selected.label) : placeholder}
          </span>
          {value ? null : <ChevronDown className="size-4 shrink-0 text-muted" />}
        </button>
        {value ? (
          <button
            type="button"
            aria-label="Limpar seleção"
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-teal-50 hover:text-ink"
            onClick={() => onChange('')}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
              <button type="button" aria-label="Fechar lista" className="absolute inset-0 bg-ink/40" onClick={close} />
              <div
                role="dialog"
                aria-label={placeholder}
                className="relative flex max-h-[min(36rem,88dvh)] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
              >
                <div className="sticky top-0 border-b border-line p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value)
                        setActiveIndex(0)
                      }}
                      onKeyDown={onSearchKeyDown}
                      placeholder={searchPlaceholder}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="search"
                      enterKeyHint="search"
                      className="h-11 w-full rounded-xl border border-line bg-white py-2 pl-9 pr-10 text-base text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {query || value ? (
                      <button
                        type="button"
                        aria-label={query ? 'Limpar pesquisa' : 'Limpar seleção'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-teal-50 hover:text-ink"
                        onClick={clearField}
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div id={listId} role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-muted">{emptyText}</p>
                  ) : (
                    filtered.map((group) => (
                      <section key={group.label} className="mb-2">
                        <h3 className="sticky top-0 z-10 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                          {group.label}
                        </h3>
                        <div className="space-y-0.5">
                          {group.options.map((option) => {
                            const index = flatOptions.findIndex((item) => item.value === option.value)
                            const active = index === activeIndex
                            const checked = option.value === value
                            return (
                              <button
                                key={option.value}
                                ref={(node) => {
                                  optionRefs.current[index] = node
                                }}
                                type="button"
                                role="option"
                                aria-selected={checked}
                                className={cn(
                                  'flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm',
                                  active ? 'bg-teal-50 text-ink' : 'text-ink',
                                  checked && 'font-semibold',
                                )}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => selectOption(option.value)}
                              >
                                <span className="min-w-0 flex-1">{option.label}</span>
                                {checked ? <Check className="size-4 shrink-0 text-primary" /> : null}
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    ))
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
