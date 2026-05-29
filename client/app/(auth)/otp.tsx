import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { resendOtp, verifyOtp } from '@/lib/auth-api';
import { clearPendingOtpSession, getPendingOtpSession, type PendingOtpSession } from '@/lib/auth-session';
import { useAuth } from '@/providers/auth-provider';

export default function OtpScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [session, setSession] = useState<PendingOtpSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputs = useRef<Array<TextInput | null>>([]);

  const codeValue = code.join('');

  useEffect(() => {
    setSession(getPendingOtpSession());
  }, []);

  const recipient = session?.email || session?.phone || 'your contact';

  const updateDigit = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, '').slice(-1);
    const nextCode = [...code];
    nextCode[index] = nextValue;
    setCode(nextCode);

    if (nextValue && index < inputs.current.length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!session) {
      setErrorMessage('Start again from sign in or sign up so we know where to verify the code.');
      return;
    }

    if (codeValue.length !== 6) {
      setErrorMessage('Enter the 6 digit code.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const verification = await verifyOtp({
        userId: session.userId,
        code: codeValue,
      });

      await signIn(verification.token, verification.user);

      clearPendingOtpSession();
      router.replace('/(tabs)');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify the code right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!session) {
      setErrorMessage('Start again from sign in or sign up so we can resend the code.');
      return;
    }

    try {
      setIsResending(true);
      setErrorMessage('');

      const result = await resendOtp({
        identifier: session.email || session.phone,
      });

      setSession({
        userId: result.challenge.userId,
        fullName: result.user.fullName,
        email: result.user.email,
        phone: result.user.phone,
        purpose: result.challenge.purpose,
        expiresAt: result.challenge.expiresAt,
      });

      if (result.devOtp) {
        Alert.alert('Dev OTP', `Your new verification code is ${result.devOtp}`);
      } else {
        Alert.alert('Code sent', `We sent a new code to ${recipient}.`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to resend the code right now.');
    } finally {
      setIsResending(false);
    }
  };

  const canVerify = codeValue.length === 6 && !!session;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeIcon}>
              <MaterialCommunityIcons name="cellphone-lock" size={20} color="#FAFAFA" />
            </View>
            <Text style={styles.badgeText}>OTP verification</Text>
          </View>

          <Text style={styles.title}>Enter the 6 digit code</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to {recipient}. Use it to finish sign in or sign up.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.codeRow}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputs.current[index] = ref;
                }}
                value={digit}
                onChangeText={(value) => updateDigit(index, value)}
                style={styles.codeInput}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
              />
            ))}
          </View>

          <Pressable
            style={[styles.primaryButton, !canVerify && styles.primaryButtonDisabled, isSubmitting && styles.primaryButtonDisabled]}
            onPress={handleVerify}
            disabled={!canVerify || isSubmitting}
            accessibilityRole="button">
            <Text style={styles.primaryButtonText}>{isSubmitting ? 'Verifying...' : 'Verify and continue'}</Text>
          </Pressable>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable style={[styles.secondaryButton, isResending && styles.secondaryButtonDisabled]} onPress={handleResend} disabled={isResending} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>{isResending ? 'Resending...' : 'Resend code'}</Text>
          </Pressable>
        </View>
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
    gap: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  codeInput: {
    flex: 1,
    minWidth: 44,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: '#27272A',
    color: '#FAFAFA',
    fontSize: 20,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
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
  },
  secondaryButtonDisabled: {
    opacity: 0.7,
  },
  secondaryButtonText: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '600',
  },
});