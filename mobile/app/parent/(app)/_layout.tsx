import type { ColorValue } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { AuthGate } from '../../../src/components/AuthGate'
import { useMyInvoices } from '../../../src/hooks/useParent'
import { colors } from '../../../src/theme'

type IconName = keyof typeof Ionicons.glyphMap

function tabIcon(active: IconName, inactive: IconName) {
  return ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? active : inactive} color={color} size={size} />
  )
}

function ParentTabs() {
  const { data: invoices } = useMyInvoices()
  const unpaid = invoices?.filter((inv) => inv.status === 'issued' || inv.status === 'overdue').length ?? 0

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.warning,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Track', tabBarIcon: tabIcon('location', 'location-outline') }} />
      <Tabs.Screen name="children" options={{ title: 'My children', tabBarIcon: tabIcon('people', 'people-outline') }} />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: tabIcon('receipt', 'receipt-outline'),
          tabBarBadge: unpaid > 0 ? unpaid : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.text },
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person', 'person-outline') }} />
    </Tabs>
  )
}

export default function ParentAppLayout() {
  return (
    <AuthGate>
      <ParentTabs />
    </AuthGate>
  )
}
