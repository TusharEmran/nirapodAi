import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { loginUser } from '@/lib/auth-api';
import { useAuth } from '@/providers/auth-provider';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      setErrorMessage('Enter your email or phone number and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const result = await loginUser({
        identifier: trimmedIdentifier,
        password,
      });

      await signIn(result.token, result.user);
      router.replace('/(tabs)');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.title}>Sign in to Sentinel AI</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Email or phone</Text>
            <View style={styles.inputShell}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#A46A76" />
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="you@example.com or +233..."
                placeholderTextColor="#B89BA3"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="default"
              />
            </View>

            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputShell}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#A46A76" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#B89BA3"
                style={styles.input}
                secureTextEntry
              />
            </View>

            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
              accessibilityRole="button">
              <Text style={styles.primaryButtonText}>{isSubmitting ? 'Signing in...' : 'Sign in'}</Text>
            </Pressable>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push('/(auth)/signup')}
              accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Create new account</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#C84D61',
  },
  content: {
    flexGrow: 1,
    padding: 18,
    paddingTop: 56,
    gap: 14,
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.98)',
    padding: 18,
    gap: 10,
    shadowColor: '#7A2434',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7EDEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#B85A6B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#1D1D1F',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: '#71585F',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  formCard: {
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.98)',
    padding: 18,
    gap: 10,
    shadowColor: '#7A2434',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  fieldLabel: {
    color: '#1D1D1F',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#F7F0F2',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#C84D61',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  errorText: {
    color: '#B84A5A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#F7EDEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#B84A5A',
    fontSize: 15,
    fontWeight: '800',
  },
});
