import type { PlanSummary } from '@/api/admin'

/** How much of its plan an operator is using. `limit` is null for an unlimited plan. */
export function planUsage(operator: { plan: PlanSummary | null; active_students_count: number }) {
  const limit = operator.plan?.student_limit ?? null
  const used = operator.active_students_count

  return { used, limit, over: limit !== null && used > limit }
}
