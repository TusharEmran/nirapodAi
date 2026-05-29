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
          <Text style={styles.subtitle}>Welcome back. Please enter your details.</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Email or phone</Text>
            <View style={styles.inputShell}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#A1A1AA" />
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="you@example.com or +233..."
                placeholderTextColor="#71717A"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="default"
              />
            </View>

            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputShell}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#A1A1AA" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#71717A"
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
    backgroundColor: '#09090B',
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    gap: 20,
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: '#18181B',
    padding: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  title: {
    color: '#FAFAFA',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#A1A1AA',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  formCard: {
    borderRadius: 24,
    backgroundColor: '#18181B',
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  fieldLabel: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '500',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#09090B',
    fontSize: 16,
    fontWeight: '800',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  secondaryButtonText: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '600',
  },
});
