import type { ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme'

export type BadgeTone = 'neutral' | 'success' | 'info' | 'danger' | 'warning'

const badgeTones: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surface, fg: colors.muted },
  success: { bg: colors.successSoft, fg: colors.success },
  info: { bg: colors.infoSoft, fg: colors.info },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  warning: { bg: colors.primarySoft, fg: colors.warning },
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { bg, fg } = badgeTones[tone]
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: fg + '33' }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body?: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
  },
  titleBlock: { gap: 2, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: colors.muted, textAlign: 'center', maxWidth: 280 },
})
