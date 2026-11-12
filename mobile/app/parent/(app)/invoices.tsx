import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { Badge, Card, EmptyState, ScreenTitle, type BadgeTone } from '../../../src/components/ui'
import { useMyInvoices } from '../../../src/hooks/useParent'
import { webBaseUrl } from '../../../src/api/client'
import type { Invoice } from '../../../src/api/parent'
import { formatDate, formatMoney } from '../../../src/lib/format'
import { colors } from '../../../src/theme'

function isOverdue(invoice: Invoice): boolean {
  return invoice.status === 'overdue' || (invoice.status === 'issued' && new Date(invoice.due_date) < new Date())
}

function invoiceBadge(invoice: Invoice): { label: string; tone: BadgeTone } {
  if (invoice.status === 'paid') return { label: 'Paid', tone: 'success' }
  if (isOverdue(invoice)) return { label: 'Overdue', tone: 'danger' }
  if (invoice.status === 'draft') return { label: 'Draft', tone: 'neutral' }
  return { label: 'Due', tone: 'info' }
}

/**
 * Payment is handed off to the web portal in an in-app browser for now — a
 * native ToyyibPay flow comes once real payments are wired up on the backend.
 */
function openPayment() {
  WebBrowser.openBrowserAsync(`${webBaseUrl}/parent/invoices/pay`)
}

function OutstandingCard({ invoices }: { invoices: Invoice[] }) {
  const unpaid = invoices.filter((inv) => inv.status === 'issued' || inv.status === 'overdue')
  if (unpaid.length === 0) return null
  const total = unpaid.reduce((sum, inv) => sum + Number(inv.final_amount), 0)
  const overdue = unpaid.some(isOverdue)

  return (
    <Card style={[styles.outstanding, overdue && styles.outstandingOverdue]}>
      <Text style={styles.outstandingLabel}>{overdue ? 'Payment overdue' : 'Outstanding'}</Text>
      <Text style={styles.outstandingAmount}>{formatMoney(total)}</Text>
      <Text style={styles.outstandingNote}>
        {unpaid.length} unpaid {unpaid.length === 1 ? 'invoice' : 'invoices'}
      </Text>
      <Pressable style={styles.payButton} onPress={openPayment}>
        <Text style={styles.payText}>Pay now</Text>
      </Pressable>
    </Card>
  )
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const badge = invoiceBadge(invoice)
  return (
    <View style={styles.invoice}>
      <View style={styles.flex}>
        <Text style={styles.invoiceStudent} numberOfLines={1}>{invoice.student?.full_name ?? 'Invoice'}</Text>
        <Text style={styles.invoicePeriod}>
          {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
        </Text>
        <Text style={styles.invoiceDue}>
          {invoice.status === 'paid' && invoice.paid_at
            ? `Paid ${formatDate(invoice.paid_at)}`
            : `Due ${formatDate(invoice.due_date)}`}
        </Text>
      </View>
      <View style={styles.invoiceRight}>
        <Text style={styles.invoiceAmount}>{formatMoney(invoice.final_amount)}</Text>
        <Badge label={badge.label} tone={badge.tone} />
      </View>
    </View>
  )
}

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets()
  const { data: invoices, isLoading, isError, refetch, isRefetching } = useMyInvoices()

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      data={invoices}
      keyExtractor={(invoice) => String(invoice.id)}
      renderItem={({ item }) => <InvoiceRow invoice={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View>
          <ScreenTitle title="Invoices" />
          <OutstandingCard invoices={invoices ?? []} />
          {invoices && invoices.length > 0 && <Text style={styles.sectionTitle}>All invoices</Text>}
        </View>
      }
      ListEmptyComponent={
        isError ? (
          <EmptyState icon="cloud-offline-outline" title="Couldn't load invoices" body="Pull down to try again." />
        ) : (
          <EmptyState icon="receipt-outline" title="No invoices yet" />
        )
      }
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    />
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  outstanding: { gap: 4, marginBottom: 20 },
  outstandingOverdue: { borderColor: colors.danger + '55', backgroundColor: colors.dangerSoft },
  outstandingLabel: { fontSize: 13, fontWeight: '600', color: colors.muted },
  outstandingAmount: { fontSize: 30, fontWeight: '700', color: colors.text },
  outstandingNote: { fontSize: 13, color: colors.muted },
  payButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  payText: { fontSize: 16, fontWeight: '600', color: colors.text },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  invoice: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  separator: { height: 8 },
  invoiceStudent: { fontSize: 15, fontWeight: '600', color: colors.text },
  invoicePeriod: { fontSize: 13, color: colors.muted, marginTop: 2 },
  invoiceDue: { fontSize: 12, color: colors.muted, marginTop: 2 },
  invoiceRight: { alignItems: 'flex-end', gap: 6 },
  invoiceAmount: { fontSize: 15, fontWeight: '600', color: colors.text },
})
