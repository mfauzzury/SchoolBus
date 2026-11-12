import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { isAxiosError } from 'axios'
import { parentLogin } from '../../src/api/auth'
import { setToken } from '../../src/lib/secureToken'

export default function ParentLoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const { token } = await parentLogin({
        email: email.trim(),
        password,
        device_name: `parent-app (${Platform.OS})`,
      })
      await setToken(token)
      router.replace('/parent')
    } catch (err) {
      setError(
        isAxiosError(err) && err.response
          ? err.response.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : 'Invalid email or password.'
          : 'Could not reach the server. Check your connection.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brand}>
        <View style={styles.brandMark} />
        <Text style={styles.brandName}>BasSekolah.my</Text>
      </View>
      <Text style={styles.title}>Log in</Text>
      <Text style={styles.subtitle}>Use the same email and password as the parent portal.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="username"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={onSubmit}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable
        style={[styles.button, (submitting || !email || !password) && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={submitting || !email || !password}
      >
        <Text style={styles.buttonText}>{submitting ? 'Logging in…' : 'Log in'}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  brandMark: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#ffce1b' },
  brandName: { fontSize: 17, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, fontSize: 16 },
  error: { color: '#dc2626' },
  button: { backgroundColor: '#ffce1b', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#111827', fontWeight: '600', fontSize: 16 },
})
