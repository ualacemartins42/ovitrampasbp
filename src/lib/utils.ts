import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function foldSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function createId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function toDateTimeLocalValue(iso?: string): string {
  const date = iso ? new Date(iso) : new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString()
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso))
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function toDateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export function isoToDateInput(iso: string | null | undefined, fallback = new Date()): string {
  const date = iso ? new Date(iso) : fallback
  if (Number.isNaN(date.getTime())) return toDateInputValue(fallback)
  return toDateInputValue(date)
}

export function dateInputToIso(value: string, reference = new Date()): string {
  const date = parseDateInput(value) ?? new Date(reference)
  date.setHours(
    reference.getHours(),
    reference.getMinutes(),
    reference.getSeconds(),
    reference.getMilliseconds(),
  )
  return date.toISOString()
}

export function isSameLocalDay(iso: string, reference = new Date()): boolean {
  const date = new Date(iso)
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  )
}

export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseOptionalFloat(value: string): number | null {
  const trimmed = value.replace(',', '.').trim()
  if (!trimmed) return null
  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseOptionalCoordinate(value: string, kind: 'latitude' | 'longitude'): number | null {
  const trimmed = value.replace(/\s/g, '').replace(',', '.')
  if (!trimmed) return null

  const label = kind === 'latitude' ? 'Latitude' : 'Longitude'
  const min = kind === 'latitude' ? -90 : -180
  const max = kind === 'latitude' ? 90 : 180

  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`${label} inválida. Use um número, por exemplo -22.523456.`)
  }

  const parsed = Number.parseFloat(trimmed)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} deve estar entre ${min} e ${max}.`)
  }

  return parsed
}

export function compactCpf(value: string): string {
  return value.replace(/\D/g, '')
}
