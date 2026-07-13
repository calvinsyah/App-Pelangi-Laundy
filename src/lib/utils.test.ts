import { describe, it, expect } from 'vitest'
import { terbilang, fmtRp, toRoman, parseCurrencyValue } from './utils'

describe('Utils', () => {
  it('terbilang', () => {
    expect(terbilang(15)).toBe('lima belas')
    expect(terbilang(120)).toBe('seratus dua puluh')
  })

  it('fmtRp', () => {
    expect(fmtRp(1500000)).toBe('Rp 1.500.000')
    expect(fmtRp(-500)).toBe('- Rp 500')
  })

  it('toRoman', () => {
    expect(toRoman(1)).toBe('I')
    expect(toRoman(12)).toBe('XII')
  })

  it('parseCurrencyValue', () => {
    expect(parseCurrencyValue('1.500.000')).toBe(1500000)
    expect(parseCurrencyValue('')).toBe(0)
  })
})
