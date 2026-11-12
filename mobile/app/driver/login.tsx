import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { driverLogin } from '../../src/api/auth'
import { setToken } from '../../src/lib/secureToken'

export default function LoginScreen() {
  const [operatorCode, setOperatorCode] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const { token } = await driverLogin({
        operator_code: operatorCode,
        phone,
        pin,
        device_name: 'driver-app',
      })
      await setToken(token)
      router.replace('/driver')
    } catch {
      setError('Invalid operator code, phone, or PIN.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Operator code"
        value={operatorCode}
        onChangeText={setOperatorCode}
        keyboardType="number-pad"
        maxLength={5}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="default"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="PIN"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Logging in…' : 'Log in'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: '#dc2626', textAlign: 'center' },
  button: { backgroundColor: '#f59e0b', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#111827', fontWeight: '600', fontSize: 16 },
})
