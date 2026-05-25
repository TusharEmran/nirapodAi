import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();
  const scale = useRef(new Animated.Value(0.96)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 1800);

    return () => clearTimeout(timer);
  }, [fade, router, scale]);

  return (
    <View style={styles.screen}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}>
        <View style={styles.logoRing}>
          <View style={styles.logoCore}>
            <MaterialCommunityIcons name="shield-sun" size={42} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.title}>Sentinel AI</Text>
        <Text style={styles.subtitle}>Protect. Detect. Respond.</Text>

        <View style={styles.loadingRow}>
          <View style={styles.loadingDot} />
          <View style={[styles.loadingDot, styles.loadingDotMid]} />
          <View style={[styles.loadingDot, styles.loadingDotLast]} />
        </View>

        <Pressable style={styles.skipButton} onPress={() => router.replace('/(auth)/login')} accessibilityRole="button">
          <Text style={styles.skipButtonText}>Continue</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#C84D61',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glowOne: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -80,
    right: -100,
  },
  glowTwo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -70,
    left: -80,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    marginHorizontal: 20,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  logoRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  logoCore: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B84A5A',
    shadowColor: '#7A2434',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  loadingDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    opacity: 0.95,
  },
  loadingDotMid: {
    opacity: 0.7,
  },
  loadingDotLast: {
    opacity: 0.45,
  },
  skipButton: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});