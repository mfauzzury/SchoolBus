import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addOperatorNote,
  getNotificationOverview,
  listNotificationLog,
  setNotificationEnabled,
  getIntegrationSettings,
  removeIntegration,
  saveBrevo,
  saveWhatsApp,
  testBrevo,
  testWhatsApp,
  createAnnouncement,
  deleteAnnouncement,
  getInboxMessage,
  getInboxSummary,
  getSystemHealth,
  handleInboxMessage,
  listAnnouncements,
  listInbox,
  reopenInboxMessage,
  updateAnnouncement,
  assignOperatorPlan,
  createPlan,
  deletePlan,
  getAttention,
  getTrends,
  listPaymentAttempts,
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
  type AnnouncementInput,
  type BillplzSettingsInput,
  type NotificationLogFilters,
  type NotificationTypeKey,
  type BrevoInput,
  type WhatsAppInput,
  type OperatorDetailsInput,
  type OperatorFilters,
  type PaymentAttemptFilters,
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
    placeholderData: (previous) => previous,
  })
}

export function usePaymentAttempts(filters: PaymentAttemptFilters) {
  return useQuery({
    queryKey: ['admin-payment-attempts', filters],
    queryFn: () => listPaymentAttempts(filters),
    placeholderData: (previous) => previous,
  })
}

export function usePlatformTrends() {
  return useQuery({ queryKey: ['admin-dashboard-trends'], queryFn: getTrends })
}

export function usePlatformAttention() {
  return useQuery({ queryKey: ['admin-dashboard-attention'], queryFn: getAttention })
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

export function useInbox(filters: { page?: number; status?: 'open' | 'handled' }) {
  return useQuery({
    queryKey: ['admin-inbox', filters],
    queryFn: () => listInbox(filters),
    placeholderData: (previous) => previous,
  })
}

/** How many messages are waiting; refreshed in the background so the menu badge stays current. */
export function useInboxSummary(enabled = true) {
  return useQuery({
    queryKey: ['admin-inbox-summary'],
    queryFn: getInboxSummary,
    enabled,
    refetchInterval: 60_000,
  })
}

export function useInboxMessage(id: number) {
  return useQuery({ queryKey: ['admin-inbox-message', id], queryFn: () => getInboxMessage(id) })
}

function useInboxMutation(mutationFn: (id: number) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inbox'] })
      queryClient.invalidateQueries({ queryKey: ['admin-inbox-message'] })
      queryClient.invalidateQueries({ queryKey: ['admin-inbox-summary'] })
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
    },
  })
}

export function useHandleInboxMessage() {
  return useInboxMutation(handleInboxMessage)
}

export function useReopenInboxMessage() {
  return useInboxMutation(reopenInboxMessage)
}

export function useAnnouncements() {
  return useQuery({ queryKey: ['admin-announcements'], queryFn: listAnnouncements })
}

export function useSaveAnnouncement(id?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AnnouncementInput) =>
      id ? updateAnnouncement(id, input) : createAnnouncement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
    },
  })
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
    },
  })
}

export function useSystemHealth() {
  return useQuery({ queryKey: ['admin-system'], queryFn: getSystemHealth })
}

export function useIntegrationSettings() {
  return useQuery({ queryKey: ['admin-integrations'], queryFn: getIntegrationSettings })
}

function useIntegrationMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-integrations'] })
      // The server status card reports which mailer is live.
      queryClient.invalidateQueries({ queryKey: ['admin-system'] })
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
    },
  })
}

export function useSaveBrevo() {
  return useIntegrationMutation((input: BrevoInput) => saveBrevo(input))
}

export function useSaveWhatsApp() {
  return useIntegrationMutation((input: WhatsAppInput) => saveWhatsApp(input))
}

export function useRemoveIntegration() {
  return useIntegrationMutation((provider: 'brevo' | 'whatsapp') => removeIntegration(provider))
}

export function useTestBrevo() {
  return useMutation({ mutationFn: (to: string) => testBrevo(to) })
}

export function useTestWhatsApp() {
  return useMutation({ mutationFn: (to: string) => testWhatsApp(to) })
}

export function useNotificationOverview() {
  return useQuery({ queryKey: ['admin-notifications'], queryFn: getNotificationOverview })
}

export function useSetNotificationEnabled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ type, enabled }: { type: NotificationTypeKey; enabled: boolean }) =>
      setNotificationEnabled(type, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] })
    },
  })
}

export function useNotificationLog(filters: NotificationLogFilters) {
  return useQuery({
    queryKey: ['admin-notification-log', filters],
    queryFn: () => listNotificationLog(filters),
    placeholderData: (previous) => previous,
  })
}
