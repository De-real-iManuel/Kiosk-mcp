import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { isBusinessOpen } from './hours.js'
import type { OpeningHours } from '../schema/businesses.js'

function allOpenHours(): OpeningHours {
  return {
    monday:    { open: '09:00', close: '17:00', closed: false },
    tuesday:   { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday:  { open: '09:00', close: '17:00', closed: false },
    friday:    { open: '09:00', close: '17:00', closed: false },
    saturday:  { open: '09:00', close: '17:00', closed: false },
    sunday:    { open: '09:00', close: '17:00', closed: false },
  }
}

function allClosedHours(): OpeningHours {
  return {
    monday: null, tuesday: null, wednesday: null, thursday: null,
    friday: null, saturday: null, sunday: null,
  }
}

describe('isBusinessOpen — Property Tests', () => {
  it('Property 7: within hours returns is_open=true', () => {
    const hours = allOpenHours()
    // Monday 12:00 UTC — inside 09:00-17:00
    const result = isBusinessOpen(hours, 'UTC', new Date('2024-01-15T12:00:00Z'))
    expect(result.is_open).toBe(true)
  })

  it('Property 7: before opening time returns is_open=false', () => {
    const hours = allOpenHours()
    // Monday 07:00 UTC — before 09:00
    const result = isBusinessOpen(hours, 'UTC', new Date('2024-01-15T07:00:00Z'))
    expect(result.is_open).toBe(false)
  })

  it('Property 7: exactly at open time returns is_open=true', () => {
    const hours = allOpenHours()
    // Monday 09:00 UTC exactly
    const result = isBusinessOpen(hours, 'UTC', new Date('2024-01-15T09:00:00Z'))
    expect(result.is_open).toBe(true)
  })

  it('Property 8: null-hours day returns is_open=false for any time', () => {
    const hours = allClosedHours()
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        (dayOffset) => {
          const base = new Date('2024-01-15T12:00:00Z') // Monday
          const d = new Date(base.getTime() + dayOffset * 86400000)
          const result = isBusinessOpen(hours, 'UTC', d)
          expect(result.is_open).toBe(false)
        },
      ),
    )
  })

  it('Property 9: future open day found when closed now (Friday is open, checking Monday)', () => {
    const hours: OpeningHours = {
      monday: null, tuesday: null, wednesday: null, thursday: null,
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: null, sunday: null,
    }
    const monday = new Date('2024-01-15T12:00:00Z')
    const result = isBusinessOpen(hours, 'UTC', monday)
    expect(result.is_open).toBe(false)
    expect(result.next_open_at).toBeDefined()
    const nextOpen = new Date(result.next_open_at!)
    expect(nextOpen.getTime()).toBeGreaterThan(monday.getTime())
    // Must be within 7 days
    expect(nextOpen.getTime() - monday.getTime()).toBeLessThanOrEqual(7 * 86400000)
  })

  it('returns is_open=false and next_open_at=undefined when no hours provided', () => {
    const result = isBusinessOpen(null, 'UTC', new Date())
    expect(result.is_open).toBe(false)
    expect(result.next_open_at).toBeUndefined()
  })

  it('all-closed business never returns next_open_at', () => {
    const hours = allClosedHours()
    const result = isBusinessOpen(hours, 'UTC', new Date('2024-01-15T12:00:00Z'))
    expect(result.is_open).toBe(false)
    expect(result.next_open_at).toBeUndefined()
  })
})