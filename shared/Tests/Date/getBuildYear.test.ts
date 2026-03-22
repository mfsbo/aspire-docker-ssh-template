import { describe, it, expect } from 'vitest'
import { getBuildYear } from '../../src/Date/getBuildYear'

describe('getBuildYear', () => {
  it('extracts the UTC year from a date', () => {
    expect(getBuildYear(new Date('2026-03-22T18:37:00.000Z'))).toBe(2026)
  })

  it('correctly handles year boundary — end of year stays in the old year (UTC)', () => {
    // 2025-12-31T23:59:59Z is still 2025 in UTC
    expect(getBuildYear(new Date('2025-12-31T23:59:59.000Z'))).toBe(2025)
  })

  it('correctly handles year boundary — midnight flips to the new year (UTC)', () => {
    // 2026-01-01T00:00:00Z is already 2026 in UTC
    expect(getBuildYear(new Date('2026-01-01T00:00:00.000Z'))).toBe(2026)
  })

  it('returns a number type', () => {
    expect(typeof getBuildYear(new Date())).toBe('number')
  })

  it('returns a four-digit year', () => {
    const year = getBuildYear(new Date('2026-06-15T10:00:00.000Z'))
    expect(year).toBeGreaterThan(999)
    expect(year).toBeLessThan(10000)
  })
})
