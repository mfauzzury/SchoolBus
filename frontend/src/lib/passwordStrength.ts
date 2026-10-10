export type StrengthScore = 0 | 1 | 2 | 3 | 4

export interface PasswordStrength {
  /** 0 = too short, 1 = weak, 2 = fair, 3 = good, 4 = strong. */
  score: StrengthScore
  checks: { length: boolean; letter: boolean; number: boolean }
  /** Meets the minimum the server enforces: 8+ characters with a letter and a number. */
  meetsMinimum: boolean
}

// Substrings that make a password guessable no matter how long it is.
const PREDICTABLE = [
  'password',
  'kata laluan',
  'katalaluan',
  'qwerty',
  'asdf',
  'zxcv',
  'abcd',
  '1234',
  '4321',
  '0000',
  '1111',
  'iloveyou',
  'letmein',
  'welcome',
  'admin',
]

function isPredictable(password: string): boolean {
  const lower = password.toLowerCase()
  return /^(.)\1+$/.test(password) || PREDICTABLE.some((word) => lower.includes(word))
}

/**
 * Advisory strength heuristic for the signup meter. The hard rule (the one the
 * server also enforces) is only `meetsMinimum`; the score nudges people toward
 * longer, more varied passwords without blocking them.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
  }
  const meetsMinimum = checks.length && checks.letter && checks.number

  if (!checks.length) {
    return { score: 0, checks, meetsMinimum }
  }

  if (isPredictable(password)) {
    return { score: 1, checks, meetsMinimum }
  }

  const types = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  const points = 1 + (password.length >= 12 ? 1 : 0) + (types >= 3 ? 1 : 0) + 1

  return { score: Math.min(points, 4) as StrengthScore, checks, meetsMinimum }
}
