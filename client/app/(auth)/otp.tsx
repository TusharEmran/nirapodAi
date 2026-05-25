import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function OtpScreen() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<TextInput | null>>([]);

  const codeValue = code.join('');

  const updateDigit = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, '').slice(-1);
    const nextCode = [...code];
    nextCode[index] = nextValue;
    setCode(nextCode);

    if (nextValue && index < inputs.current.length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <View style={styles.badgeIcon}>
              <MaterialCommunityIcons name="cellphone-lock" size={22} color="#C84D61" />
            </View>
            <Text style={styles.badgeText}>OTP verification</Text>
          </View>

          <Text style={styles.title}>Enter the 6 digit code</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to your phone or email. Use it to finish sign in or sign up.
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
            style={[styles.primaryButton, codeValue.length !== 6 && styles.primaryButtonDisabled]}
            onPress={() => router.replace('/(tabs)')}
            accessibilityRole="button">
            <Text style={styles.primaryButtonText}>Verify and continue</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>Resend code</Text>
          </Pressable>
        </View>
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
    gap: 12,
    shadowColor: '#7A2434',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  codeInput: {
    flex: 1,
    minWidth: 44,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F7F0F2',
    color: '#1D1D1F',
    fontSize: 20,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#C84D61',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
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