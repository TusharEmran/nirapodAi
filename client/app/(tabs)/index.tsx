import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';

const googleMapApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAP_API;

const quickActions = [
  { label: 'Record', icon: 'microphone' },
  { label: 'Scan my\narea', icon: 'radar' },
  { label: 'Snap', icon: 'camera' },
  { label: 'More', icon: 'dots-horizontal' },
] as const;

const contacts = [
  { name: 'Abigail Tetteh', phone: '+233501497265', initials: 'AT', avatar: '#7AB0C0' },
  { name: 'Abena Kyekyeku', phone: '+233...', initials: 'AK', avatar: '#C9A56C' },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const [showEmergencyOverlay, setShowEmergencyOverlay] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const pulseOne = useRef(new Animated.Value(0)).current;
  const pulseTwo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    const loadLocation = async () => {
      const permissions = await Location.getForegroundPermissionsAsync();
      const nextPermissions = permissions.status === 'granted'
        ? permissions
        : await Location.requestForegroundPermissionsAsync();

      if (!isMounted || nextPermissions.status !== 'granted') {
        return;
      }

      const position = await Location.getCurrentPositionAsync({});

      if (isMounted) {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      }
    };

    void loadLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const createPulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const first = createPulse(pulseOne, 0);
    const second = createPulse(pulseTwo, 900);

    first.start();
    second.start();

    return () => {
      first.stop();
      second.stop();
    };
  }, [pulseOne, pulseTwo]);

  const pulseOneStyle = {
    opacity: pulseOne.interpolate({
      inputRange: [0, 1],
      outputRange: [0.34, 0],
    }),
    transform: [
      {
        scale: pulseOne.interpolate({
          inputRange: [0, 1],
          outputRange: [0.78, 1.5],
        }),
      },
    ],
  };

  const pulseTwoStyle = {
    opacity: pulseTwo.interpolate({
      inputRange: [0, 1],
      outputRange: [0.24, 0],
    }),
    transform: [
      {
        scale: pulseTwo.interpolate({
          inputRange: [0, 1],
          outputRange: [0.82, 1.62],
        }),
      },
    ],
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.headerRow}>
            <View style={styles.logoRow}>
              <View style={styles.logoMark}>
                <MaterialCommunityIcons name="shield" size={28} color="#C84D61" />
              </View>
              <Text style={styles.logoText}>Her{`\n`}Shield</Text>
            </View>

            <View style={styles.bellButton}>
              <MaterialCommunityIcons name="bell" size={22} color="#B84A5A" />
            </View>
          </View>

          <View style={styles.sosWrap}>
            <Pressable
              onPress={() => setShowEmergencyOverlay(true)}
              accessibilityRole="button"
              accessibilityLabel="Open SOS alert"
              style={styles.sosButtonPressable}>
              <Animated.View pointerEvents="none" style={[styles.sosPulse, styles.sosPulsePrimary, pulseOneStyle]} />
              <Animated.View pointerEvents="none" style={[styles.sosPulse, styles.sosPulseSecondary, pulseTwoStyle]} />
              <View style={styles.sosGlow} />
              <View style={styles.sosRing}>
                <View style={styles.sosButton}>
                  <Text style={styles.sosText}>SOS</Text>
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.mapSection}>
          <View style={styles.mapCard}>
            {currentLocation ? (
              <MapView
                ref={mapRef}
                style={styles.mapImage}
                initialRegion={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
                zoomEnabled={true}
                scrollEnabled={true}
              >
                <Marker
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude
                  }}
                />
              </MapView>
            ) : (
              <View style={styles.mapFallback}>
                <MaterialCommunityIcons name="map" size={28} color="#C84D61" />
                <Text style={styles.mapFallbackText}>Loading live location...</Text>
              </View>
            )}
          </View>

          <View style={styles.locationRow}>
            <Pressable
              style={[styles.pill, styles.pillActive]}
              onPress={() => {
                if (currentLocation && mapRef.current) {
                  mapRef.current.animateToRegion({
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                }
              }}>
              <MaterialCommunityIcons name="map-marker-radius" size={16} color="#C84D61" />
              <Text style={styles.pillActiveText}>live location</Text>
            </Pressable>

            <Text style={styles.ellipsis}>...</Text>

            <Pressable
              style={styles.fakeCallButton}
              onPress={() => setShowEmergencyOverlay(true)}
              accessibilityRole="button"
              accessibilityLabel="Fake call">
              <MaterialCommunityIcons name="phone-plus-outline" size={15} color="#C84D61" />
              <Text style={styles.fakeCallText}>Fake call</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.contentSection}>
          <View style={styles.quickActionsRow}>
            {quickActions.map((action) => (
              <Pressable key={action.label} style={styles.quickAction}>
                <View style={styles.quickActionBox}>
                  <MaterialCommunityIcons name={action.icon as never} size={30} color="#FFFFFF" />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Contacts</Text>

          <View style={styles.contactsList}>
            {contacts.map((contact) => (
              <View key={contact.name} style={styles.contactCard}>
                <View style={[styles.avatar, { backgroundColor: contact.avatar }]}>
                  <Text style={styles.avatarText}>{contact.initials}</Text>
                </View>

                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>

                <View style={styles.contactActions}>
                  <Pressable style={styles.contactActionButton}>
                    <MaterialCommunityIcons name="access-point" size={18} color="#C84D61" />
                  </Pressable>
                  <Pressable style={styles.contactActionButton}>
                    <MaterialCommunityIcons name="phone" size={18} color="#C84D61" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {showEmergencyOverlay ? (
        <View style={styles.overlayContainer} pointerEvents="auto">
          <BlurView
            intensity={25}
            tint="default"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlayScrim} />

          <View style={styles.modalCard}>
            <View style={styles.modalTitleRow}>
              <View style={styles.modalIconCircle}>
                <MaterialCommunityIcons name="shield-alert" size={20} color="#C84D61" />
              </View>
              <Text style={styles.modalTitle}>Warning</Text>
            </View>

            <Text style={styles.modalDescription}>
              After 10s your location will be shared with your contacts and authority will contact you soon.
            </Text>

            <Pressable
              style={styles.modalButton}
              onPress={() => {
                setShowEmergencyOverlay(false);
                router.push('/emergency');
              }}
              accessibilityRole="button">
              <Text style={styles.modalButtonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 132,
    backgroundColor: '#FFFFFF',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalCard: {
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
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  modalIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,77,97,0.12)',
  },
  modalTitle: {
    color: '#B84A5A',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalDescription: {
    color: '#8F8A8D',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },
  modalButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C84D61',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  hero: {
    backgroundColor: '#FFFFFF',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 44,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200,77,97,0.1)',
  },
  logoText: {
    color: '#C84D61',
    fontSize: 21,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#F7EDEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B84A5A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sosWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    marginBottom: -20,
    zIndex: 3,
  },
  sosButtonPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(200,77,97,0.2)',
    shadowColor: '#B84A5A',
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  sosPulse: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(200,77,97,0.28)',
    backgroundColor: 'rgba(200,77,97,0.12)',
  },
  sosPulsePrimary: {
    width: 180,
    height: 180,
  },
  sosPulseSecondary: {
    width: 204,
    height: 204,
  },
  sosRing: {
    width: 160,
    height: 160,
    borderRadius: 999,
    borderWidth: 7,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A2434',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  sosButton: {
    width: 128,
    height: 128,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C84D61',
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: -1.6,
  },
  mapSection: {
    backgroundColor: '#C84D61',
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  contentSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingHorizontal: 22,
  },
  mapCard: {
    height: 158,
    borderRadius: 16,
    backgroundColor: '#FBFBFC',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(200,77,97,0.14)',
    shadowColor: '#D7B7BE',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  mapImage: {
    flex: 1,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FBFBFC',
    paddingHorizontal: 18,
  },
  mapFallbackText: {
    color: '#8F8A8D',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pinHalo: {
    position: 'absolute',
    left: 36,
    bottom: 28,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(200,77,97,0.16)',
  },
  pinDot: {
    position: 'absolute',
    left: 49,
    bottom: 41,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#C84D61',
    shadowColor: '#C84D61',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  fakeCallButton: {
    minHeight: 36,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,77,97,0.12)',
    shadowColor: '#B84A5A',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  fakeCallText: {
    color: '#C84D61',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pill: {
    minHeight: 36,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,77,97,0.12)',
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
  },
  pillText: {
    color: '#B84A5A',
    fontSize: 14,
    fontWeight: '700',
  },
  pillActiveText: {
    color: '#C84D61',
    fontSize: 14,
    fontWeight: '700',
  },
  ellipsis: {
    color: '#C84D61',
    fontSize: 26,
    lineHeight: 26,
    fontWeight: '700',
    marginTop: -4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  quickAction: {
    width: 74,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  quickActionBox: {
    width: 74,
    height: 74,
    borderRadius: 18,
    backgroundColor: '#C84D61',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A2434',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  quickActionLabel: {
    marginTop: 8,
    textAlign: 'center',
    color: '#C84D61',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 14,
    color: '#C84D61',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  contactsList: {
    gap: 12,
  },
  contactCard: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: '#FFF8F9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(200,77,97,0.08)',
    shadowColor: '#D7B7BE',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    color: '#1D1D1F',
    fontSize: 16,
    fontWeight: '800',
  },
  contactPhone: {
    color: '#D2AAB3',
    fontSize: 13,
    fontWeight: '600',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactActionButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
