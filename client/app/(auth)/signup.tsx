import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { signupUser } from '@/lib/auth-api';
import { setPendingOtpSession } from '@/lib/auth-session';
import { toPendingOtpSession } from '@/lib/auth-session-mapping';

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignup = async () => {
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFullName || !trimmedEmail || !trimmedPhone || !password) {
      setErrorMessage('Fill in your name, email, phone number, and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const result = await signupUser({
        fullName: trimmedFullName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password,
      });

      setPendingOtpSession(toPendingOtpSession(result));

      if (result.devOtp) {
        Alert.alert('Dev OTP', `Your verification code is ${result.devOtp}`);
      }

      router.push('/(auth)/otp');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeIcon}>
              <MaterialCommunityIcons name="account-plus" size={20} color="#FAFAFA" />
            </View>
            <Text style={styles.badgeText}>Create account</Text>
          </View>

          <Text style={styles.title}>Join Sentinel AI</Text>
          <Text style={styles.subtitle}>
            Set up your profile and verify your number with OTP before entering the app.
          </Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formCard}>
            <Field label="Full name" icon="card-account-details-outline" value={fullName} onChangeText={setFullName} placeholder="Your name" />
            <Field label="Email" icon="email-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
            <Field label="Phone number" icon="phone-outline" value={phone} onChangeText={setPhone} placeholder="+233..." keyboardType="phone-pad" />
            <Field label="Password" icon="lock-outline" value={password} onChangeText={setPassword} placeholder="Create password" secureTextEntry />

            <Pressable
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              onPress={handleSignup}
              disabled={isSubmitting}
              accessibilityRole="button">
              <Text style={styles.primaryButtonText}>{isSubmitting ? 'Creating account...' : 'Verify with OTP'}</Text>
            </Pressable>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.replace('/(auth)/login')}
              accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Already have an account? Sign in</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <MaterialCommunityIcons name={icon} size={20} color="#A1A1AA" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#71717A"
          style={styles.input}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
        />
      </View>
    </>
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
    gap: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
