import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <BlurView
        intensity={35}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-alert" size={20} color="#C84D61" />
          </View>
          <Text style={styles.title}>Warning</Text>
        </View>

        <Text style={styles.description}>
          After 10s your location will be shared with your contacts and authority will contact you
          soon.
        </Text>

        <Pressable style={styles.button} onPress={() => router.push('/emergency')} accessibilityRole="button">
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#7A2434',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,77,97,0.12)',
  },
  title: {
    color: '#B84A5A',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  description: {
    color: '#8F8A8D',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  button: {
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C84D61',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
