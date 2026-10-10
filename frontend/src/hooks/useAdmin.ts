import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addOperatorNote,
  assignOperatorPlan,
  createPlan,
  deletePlan,
  listPlans,
  updatePlan,
  addTeamMember,
  changeTeamLevel,
  deactivateTeamMember,
  deleteOperatorNote,
  disableBillplz,
  getOperator,
  getPlatformSummary,
  listActivity,
  listActivityActions,
  listOperatorNotes,
  listOperatorOptions,
  listOperators,
  listTeam,
  listTransactions,
  reactivateOperator,
  reactivateTeamMember,
  sendOperatorPasswordReset,
  startImpersonation,
  stopImpersonation,
  suspendOperator,
  testBillplzConnection,
  updateBillplzSettings,
  updateOperator,
  type ActivityFilters,
  type BillplzSettingsInput,
  type OperatorDetailsInput,
  type OperatorFilters,
  type PlanInput,
  type TeamMemberInput,
  type TransactionFilters,
} from '@/api/admin'

export function usePlatformSummary() {
  return useQuery({ queryKey: ['admin-dashboard-summary'], queryFn: getPlatformSummary })
}

export function useAdminOperators(filters: OperatorFilters) {
  return useQuery({
    queryKey: ['admin-operators', filters],
    queryFn: () => listOperators(filters),
    placeholderData: (previous) => previous,
  })
}

/** Id + name of every operator, for dropdowns. */
export function useOperatorOptions() {
  return useQuery({ queryKey: ['admin-operator-options'], queryFn: listOperatorOptions })
}

export function useAdminOperator(id: number) {
  return useQuery({ queryKey: ['admin-operator', id], queryFn: () => getOperator(id) })
}

export function useAdminTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['admin-transactions', filters],
    queryFn: () => listTransactions(filters),
  })
}

export function useUpdateBillplzSettings(operatorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BillplzSettingsInput) => updateBillplzSettings(operatorId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-operator', operatorId] }),
  })
}

export function useDisableBillplz(operatorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => disableBillplz(operatorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-operator', operatorId] }),
  })
}

export function useTestBillplzConnection(operatorId: number) {
  return useMutation({ mutationFn: () => testBillplzConnection(operatorId) })
}

export function useTeam() {
  return useQuery({ queryKey: ['admin-team'], queryFn: listTeam })
}

function useTeamMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team'] })
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
    },
  })
}

export function useAddTeamMember() {
  return useTeamMutation((input: TeamMemberInput) => addTeamMember(input))
}

export function useChangeTeamLevel() {
  return useTeamMutation(({ id, level }: { id: number; level: TeamMemberInput['level'] }) =>
    changeTeamLevel(id, level),
  )
}

export function useDeactivateTeamMember() {
  return useTeamMutation((id: number) => deactivateTeamMember(id))
}

export function useReactivateTeamMember() {
  return useTeamMutation((id: number) => reactivateTeamMember(id))
}

export function useActivity(filters: ActivityFilters) {
  return useQuery({
    queryKey: ['admin-activity', filters],
    queryFn: () => listActivity(filters),
    placeholderData: (previous) => previous,
  })
}

export function useActivityActions() {
  return useQuery({ queryKey: ['admin-activity-actions'], queryFn: listActivityActions })
}

function refreshOperator(queryClient: ReturnType<typeof useQueryClient>, operatorId: number) {
  queryClient.invalidateQueries({ queryKey: ['admin-operator', operatorId] })
  queryClient.invalidateQueries({ queryKey: ['admin-operators'] })
  queryClient.invalidateQueries({ queryKey: ['admin-operator-options'] })
  queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
}

export function useUpdateOperator(operatorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OperatorDetailsInput) => updateOperator(operatorId, input),
    onSuccess: () => refreshOperator(queryClient, operatorId),
  })
}

export function useSuspendOperator(operatorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => suspendOperator(operatorId, reason),
    onSuccess: () => refreshOperator(queryClient, operatorId),
  })
}

export function useReactivateOperator(operatorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reactivateOperator(operatorId),
    onSuccess: () => refreshOperator(queryClient, operatorId),
  })
}

export function useSendOperatorPasswordReset(operatorId: number) {
  return useMutation({ mutationFn: () => sendOperatorPasswordReset(operatorId) })
}

export function useOperatorNotes(operatorId: number, enabled = true) {
  return useQuery({
    queryKey: ['admin-operator-notes', operatorId],
    queryFn: () => listOperatorNotes(operatorId),
    enabled,
  })
}

export function useAddOperatorNote(operatorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => addOperatorNote(operatorId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-operator-notes', operatorId] }),
  })
}

export function useDeleteOperatorNote(operatorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: number) => deleteOperatorNote(operatorId, noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-operator-notes', operatorId] }),
  })
}

/** After either call the whole app state belongs to a different login, so callers do a full page load. */
export function useStartImpersonation() {
  return useMutation({ mutationFn: (operatorId: number) => startImpersonation(operatorId) })
}

export function useStopImpersonation() {
  return useMutation({ mutationFn: () => stopImpersonation() })
}

export function usePlans() {
  return useQuery({ queryKey: ['admin-plans'], queryFn: listPlans })
}

export function useSavePlan(planId?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PlanInput) => (planId ? updatePlan(planId, input) : createPlan(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      queryClient.invalidateQueries({ queryKey: ['admin-operators'] })
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
    },
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
    },
  })
}

export function useAssignOperatorPlan(operatorId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (planId: number) => assignOperatorPlan(operatorId, planId),
    onSuccess: () => {
      refreshOperator(queryClient, operatorId)
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
    },
  })
}
