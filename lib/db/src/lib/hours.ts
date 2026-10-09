import { toZonedTime } from 'date-fns-tz'
import type { OpeningHours, DayHours } from '../schema/businesses.js'

export interface OpenStatusResult {
  is_open: boolean
  current_day_hours: { open: string; close: string } | 'closed' | null
  next_open_at: string | undefined
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
type DayName = typeof DAYS[number]

function parseHHMM(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function getDayName(date: Date): DayName {
  return DAYS[date.getDay()]
}

function setHoursMinutes(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const result = new Date(date)
  result.setHours(h, m, 0, 0)
  return result
}

export function isBusinessOpen(
  openingHours: OpeningHours | null | undefined,
  timezone: string | null | undefined,
  nowUtc: Date,
): OpenStatusResult {
  if (!openingHours || !timezone) {
    return { is_open: false, current_day_hours: null, next_open_at: undefined }
  }

  const tz = timezone || 'UTC'
  const localNow = toZonedTime(nowUtc, tz)
  const dayName = getDayName(localNow) as keyof OpeningHours
  const todayHours: DayHours | null = openingHours[dayName]

  // Check if open today
  let isOpen = false
  let currentDayHours: OpenStatusResult['current_day_hours'] = null

  if (!todayHours || todayHours.closed) {
    currentDayHours = 'closed'
  } else {
    currentDayHours = { open: todayHours.open, close: todayHours.close }
    const openMin = parseHHMM(todayHours.open)
    const closeMin = parseHHMM(todayHours.close)
    const nowMin = localNow.getHours() * 60 + localNow.getMinutes()
    isOpen = nowMin >= openMin && nowMin < closeMin
  }

  const nextOpenAt = isOpen ? undefined : findNextOpen(openingHours, localNow, tz)

  return {
    is_open: isOpen,
    current_day_hours: currentDayHours,
    next_open_at: nextOpenAt,
  }
}

function findNextOpen(
  openingHours: OpeningHours,
  localNow: Date,
  _tz: string,
): string | undefined {
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const candidate = new Date(localNow)
    candidate.setDate(candidate.getDate() + dayOffset)
    candidate.setHours(0, 0, 0, 0)

    const dayName = getDayName(candidate) as keyof OpeningHours
    const hours: DayHours | null = openingHours[dayName]

    if (hours && !hours.closed) {
      const openTime = setHoursMinutes(candidate, hours.open)
      return openTime.toISOString()
    }
  }
  return undefined
}
