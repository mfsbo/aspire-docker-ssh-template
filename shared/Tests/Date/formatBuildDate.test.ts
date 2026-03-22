import { describe, it, expect } from 'vitest'
import { formatBuildDate } from '@shared/Date/formatBuildDate'

describe('formatBuildDate', () => {
  it('formats a known UTC date in the expected format', () => {
    const date = new Date('2026-03-22T18:37:00.000Z')
    expect(formatBuildDate(date)).toBe('22 Mar 2026, 18:37 UTC')
  })

  it('zero-pads hours and minutes', () => {
    const date = new Date('2026-01-05T09:03:00.000Z')
    expect(formatBuildDate(date)).toBe('5 Jan 2026, 09:03 UTC')
  })

  it('handles midnight correctly', () => {
    const date = new Date('2026-12-31T00:00:00.000Z')
    expect(formatBuildDate(date)).toBe('31 Dec 2026, 00:00 UTC')
  })

  it('formats all twelve months correctly', () => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]
    months.forEach((month, idx) => {
      const date = new Date(2026, idx, 15, 12, 0, 0) // local, but we check UTC
      const utcDate = new Date(Date.UTC(2026, idx, 15, 12, 0, 0))
      expect(formatBuildDate(utcDate)).toContain(month)
    })
  })

  it('returns a string type', () => {
    expect(typeof formatBuildDate(new Date())).toBe('string')
  })
})
