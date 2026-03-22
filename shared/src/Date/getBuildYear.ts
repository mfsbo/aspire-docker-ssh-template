/**
 * Extracts the UTC year from a `Date` object.
 *
 * Uses `getUTCFullYear` so the result is consistent across all timezones
 * and deterministic in tests.
 *
 * @param date - A `Date` instance representing the build time
 * @returns The four-digit UTC year, e.g. `2026`
 */
export function getBuildYear(date: Date): number {
  return date.getUTCFullYear()
}
