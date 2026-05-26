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
              <MaterialCommunityIcons name="account-plus" size={22} color="#C84D61" />
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
        <MaterialCommunityIcons name={icon} size={20} color="#A46A76" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B89BA3"
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
