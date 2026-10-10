/** Round a max value up to a "nice" axis ceiling (1, 2, 2.5, 5, 10 × 10^n). */
export function niceCeil(value: number): number {
  if (value <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(value)))
  const f = value / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * exp
}

/**
 * Gridlines at round numbers (1, 2, 2.5, 5 × 10^n), at most `maxSteps` of them,
 * topped by the first step at or above the data's peak. `minStep: 1` keeps
 * whole-number data on whole-number gridlines.
 */
export function niceAxis(peak: number, maxSteps = 5, minStep = 0): { ceiling: number; ticks: number[] } {
  const safePeak = peak > 0 ? peak : 1
  const startExp = Math.floor(Math.log10(safePeak / maxSteps)) - 1

  for (let exp = startExp; exp < startExp + 12; exp++) {
    for (const base of [1, 2, 2.5, 5]) {
      const step = base * Math.pow(10, exp)
      if (step < minStep) continue
      const steps = Math.ceil(safePeak / step)
      if (steps <= maxSteps) {
        return { ceiling: steps * step, ticks: Array.from({ length: steps + 1 }, (_, i) => i * step) }
      }
    }
  }

  return { ceiling: safePeak, ticks: [0, safePeak] }
}

export function compactMoney(value: number): string {
  if (value >= 1000) {
    const k = value / 1000
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`
  }
  return String(value)
}
