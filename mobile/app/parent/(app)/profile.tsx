import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Card, ScreenTitle } from '../../../src/components/ui'
import { useLogout, useMe } from '../../../src/hooks/useAuth'
import { colors } from '../../../src/theme'

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  onPress?: () => void
}) {
  return (
    <Pressable style={styles.infoRow} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && styles.link]} numberOfLines={1}>{value}</Text>
      </View>
    </Pressable>
  )
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { data: me } = useMe()
  const logout = useLogout()
  const profile = me?.parentProfile
  const tenant = me?.tenant
  const name = profile?.full_name ?? me?.user.name ?? ''

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <ScreenTitle title="Profile" />

      <Card style={styles.identity}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.email} numberOfLines={1}>{profile?.email ?? me?.user.email}</Text>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>My details</Text>
      <Card style={styles.group}>
        <InfoRow icon="call-outline" label="Phone" value={profile?.phone ?? '—'} />
        <InfoRow icon="mail-outline" label="Email" value={profile?.email ?? me?.user.email ?? '—'} />
      </Card>

      {tenant && (
        <>
          <Text style={styles.sectionTitle}>Your bus operator</Text>
          <Card style={styles.group}>
            <InfoRow icon="business-outline" label="Operator" value={`${tenant.company_name} · ${tenant.operator_code}`} />
            {tenant.contact_phone && (
              <InfoRow
                icon="call-outline"
                label="Phone"
                value={tenant.contact_phone}
                onPress={() => Linking.openURL(`tel:${tenant.contact_phone}`)}
              />
            )}
            {tenant.email && (
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={tenant.email}
                onPress={() => Linking.openURL(`mailto:${tenant.email}`)}
              />
            )}
          </Card>
        </>
      )}

      <Pressable style={styles.logout} onPress={() => logout.mutate()} disabled={logout.isPending}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutText}>{logout.isPending ? 'Logging out…' : 'Log out'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  flex: { flex: 1, minWidth: 0 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: colors.text },
  name: { fontSize: 18, fontWeight: '600', color: colors.text },
  email: { fontSize: 14, color: colors.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  group: { paddingVertical: 4, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoLabel: { fontSize: 12, color: colors.muted },
  infoValue: { fontSize: 15, color: colors.text },
  link: { color: colors.info },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: colors.danger },
})
