import { describe, it, expect } from 'vitest'
import { ageFromDob } from '../AgeVerificationModal'

/** A YYYY-MM-DD string for `years` before today, shifted by `dayOffset` days. */
function dobYearsAgo(years: number, dayOffset = 0): string {
  const t = new Date()
  const d = new Date(t.getFullYear() - years, t.getMonth(), t.getDate() + dayOffset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('ageFromDob — 21+ gate boundaries', () => {
  it('admits someone exactly 21 today', () => {
    expect(ageFromDob(dobYearsAgo(21))).toBe(21)
  })
  it('blocks someone whose 21st birthday is tomorrow (still 20 today)', () => {
    expect(ageFromDob(dobYearsAgo(21, 1))).toBe(20)
  })
  it('admits someone whose 21st birthday was yesterday', () => {
    expect(ageFromDob(dobYearsAgo(21, -1))).toBe(21)
  })
  it('blocks a clear 20-year-old', () => {
    expect(ageFromDob(dobYearsAgo(20))).toBe(20)
  })
  it('admits a 40-year-old', () => {
    expect(ageFromDob(dobYearsAgo(40))).toBe(40)
  })
  it('returns null for empty / invalid / impossible dates', () => {
    expect(ageFromDob('')).toBeNull()
    expect(ageFromDob('not-a-date')).toBeNull()
    expect(ageFromDob('2005-02-30')).toBeNull()
    expect(ageFromDob('2005-13-01')).toBeNull()
  })
})
