/**
 * Ordered list of abbreviated month names (UTC).
 * Using a readonly tuple ensures index access is type-checked.
 */
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

/**
 * Formats a `Date` object as a human-readable UTC build timestamp.
 *
 * Output format: `D MMM YYYY, HH:mm UTC`
 * Example: `22 Mar 2026, 18:37 UTC`
 *
 * The implementation uses UTC methods so the output is deterministic
 * regardless of the runtime's local timezone.
 *
 * @param date - A `Date` instance representing the build time
 * @returns A formatted string, e.g. `"22 Mar 2026, 18:37 UTC"`
 */
export function formatBuildDate(date: Date): string {
  const day = date.getUTCDate()
  const month = MONTHS[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes} UTC`
}
