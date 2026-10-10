import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addTeamMember,
  changeTeamLevel,
  deactivateTeamMember,
  disableBillplz,
  getOperator,
  getPlatformSummary,
  listActivity,
  listActivityActions,
  listOperators,
  listTeam,
  listTransactions,
  reactivateTeamMember,
  testBillplzConnection,
  updateBillplzSettings,
  type ActivityFilters,
  type BillplzSettingsInput,
  type TeamMemberInput,
  type TransactionFilters,
} from '@/api/admin'

export function usePlatformSummary() {
  return useQuery({ queryKey: ['admin-dashboard-summary'], queryFn: getPlatformSummary })
}

export function useAdminOperators() {
  return useQuery({ queryKey: ['admin-operators'], queryFn: listOperators })
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
