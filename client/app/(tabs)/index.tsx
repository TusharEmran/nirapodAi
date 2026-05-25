import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Alert } from 'react-native';

import { addContact, fetchContacts, type EmergencyContact } from '@/lib/auth-api';
import { useAuth } from '@/providers/auth-provider';

const quickActions = [
  { id: 'connectWatch', label: 'Connect\nwatch', icon: 'watch', accessibilityLabel: 'Connect smart watch for BP and heart rate monitoring' },
  { id: 'siren', label: 'Trigger\nsiren', icon: 'alarm-light', accessibilityLabel: 'Trigger loud siren for area scanning' },
  { id: 'snap', label: 'Snap', icon: 'camera', accessibilityLabel: 'Take a quick photo' },
  { id: 'addContact', label: 'Add\ncontact', icon: 'account-plus', accessibilityLabel: 'Add an emergency contact' },
] as const;

const sirenPassword = '122';
const sirenAudioSource = require('../../assets/images/soundreality-civil-defense-siren-128262.mp3');
const fakeCallerName = 'Emergency line';

export default function HomeScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [showEmergencyOverlay, setShowEmergencyOverlay] = useState(false);
  const [showSirenOverlay, setShowSirenOverlay] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [isCallAnswered, setIsCallAnswered] = useState(false);
  const [sirenPasswordInput, setSirenPasswordInput] = useState('');
  const [sirenPasswordError, setSirenPasswordError] = useState('');
  const [sirenStartedAt, setSirenStartedAt] = useState<number | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callElapsedSeconds, setCallElapsedSeconds] = useState(0);
  const [sirenElapsedSeconds, setSirenElapsedSeconds] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [contactError, setContactError] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const fakeCallerNumber = user?.emergencyLineNumber?.trim() || '+233 000 000 000';
  const pulseOne = useRef(new Animated.Value(0)).current;
  const pulseTwo = useRef(new Animated.Value(0)).current;
  const callPulse = useRef(new Animated.Value(0)).current;
  const sirenPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadLocation = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          return;
        }

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
      } catch {
        return;
      }
    };

    void loadLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user?.emergencyContacts) {
      setContacts(user.emergencyContacts);
    }
  }, [user]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    const loadContacts = async () => {
      try {
        const response = await fetchContacts(token);

        if (isMounted) {
          setContacts(response.contacts);
        }
      } catch (error) {
        console.error('Failed to load contacts', error);
      }
    };

    void loadContacts();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    return () => {
      sirenPlayerRef.current?.remove();
      sirenPlayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const configureAudio = async () => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
    };

    void configureAudio();
  }, []);

  useEffect(() => {
    if (!showSirenOverlay) {
      return;
    }

    const handleBackPress = () => true;
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => subscription.remove();
  }, [showSirenOverlay]);

  useEffect(() => {
    if (!showIncomingCall || isCallAnswered) {
      Vibration.cancel();
      return;
    }

    Vibration.vibrate([0, 1200, 900], true);

    return () => {
      Vibration.cancel();
    };
  }, [isCallAnswered, showIncomingCall]);

  useEffect(() => {
    if (!showIncomingCall || !isCallAnswered || callStartedAt === null) {
      setCallElapsedSeconds(0);
      return;
    }

    setCallElapsedSeconds(Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)));

    const interval = setInterval(() => {
      setCallElapsedSeconds(Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartedAt, isCallAnswered, showIncomingCall]);

  useEffect(() => {
    if (!showIncomingCall || isCallAnswered) {
      callPulse.stopAnimation();
      callPulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(callPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(callPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [callPulse, isCallAnswered, showIncomingCall]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && sirenPlayerRef.current) {
        setShowSirenOverlay(true);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!showSirenOverlay || sirenStartedAt === null) {
      setSirenElapsedSeconds(0);
      return;
    }

    setSirenElapsedSeconds(Math.max(0, Math.floor((Date.now() - sirenStartedAt) / 1000)));

    const interval = setInterval(() => {
      setSirenElapsedSeconds(Math.max(0, Math.floor((Date.now() - sirenStartedAt) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [showSirenOverlay, sirenStartedAt]);

  const startSiren = async () => {
    try {
      setSirenPasswordError('');
      setSirenStartedAt(Date.now());
      setShowSirenOverlay(true);
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });

      if (!sirenPlayerRef.current) {
        sirenPlayerRef.current = createAudioPlayer(sirenAudioSource);
      }

      const player = sirenPlayerRef.current;

      player.loop = true;
      player.volume = 1;
      player.seekTo(0).catch(() => undefined);
      player.setActiveForLockScreen(true, {
        title: 'Emergency alert',
      }, {
        showSeekBackward: false,
        showSeekForward: false,
      });
      player.play();
    } catch (error) {
      setSirenPasswordError(error instanceof Error ? error.message : 'Unable to start the siren sound right now.');
    }
  };

  const stopSiren = async () => {
    if (sirenPasswordInput !== sirenPassword) {
      setSirenPasswordError('Wrong password. Siren is still active.');
      return;
    }

    try {
      const player = sirenPlayerRef.current;

      if (player) {
        player.loop = false;
        player.pause();
        player.clearLockScreenControls();
        player.remove();
        sirenPlayerRef.current = null;
      }
    } finally {
      setSirenPasswordInput('');
      setSirenPasswordError('');
      setSirenStartedAt(null);
      setSirenElapsedSeconds(0);
      setShowSirenOverlay(false);
    }
  };

  const openAddContact = () => {
    setContactError('');
    setShowAddContactModal(true);
  };

  const openContactChat = (contact: EmergencyContact) => {
    if (!contact.isAppUser) {
      Alert.alert('Not on the app', `${contact.name} is not a Her Shield user yet.`);
      return;
    }

    router.push(`/chat/${contact.id}`);
  };

  const startFakeCall = () => {
    setShowIncomingCall(true);
    setIsCallAnswered(false);
    setCallStartedAt(null);
    setCallElapsedSeconds(0);
  };

  const answerFakeCall = () => {
    setIsCallAnswered(true);
    setCallStartedAt(Date.now());
  };

  const endFakeCall = () => {
    Vibration.cancel();
    setShowIncomingCall(false);
    setIsCallAnswered(false);
    setCallStartedAt(null);
    setCallElapsedSeconds(0);
  };

  const handleAddContact = async () => {
    if (!token) {
      setContactError('Sign in again to add a contact.');
      return;
    }

    const trimmedName = contactName.trim();
    const trimmedPhone = contactPhone.trim();

    if (!trimmedName || !trimmedPhone) {
      setContactError('Enter a contact name and phone number.');
      return;
    }

    try {
      setIsSavingContact(true);
      setContactError('');

      const response = await addContact(token, {
        name: trimmedName,
        phone: trimmedPhone,
        relationship: contactRelationship.trim(),
      });

      setContacts(response.contacts);
      setContactName('');
      setContactPhone('');
      setContactRelationship('');
      setShowAddContactModal(false);
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'Unable to add contact right now.');
    } finally {
      setIsSavingContact(false);
    }
  };

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
                provider={PROVIDER_GOOGLE}
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
              onPress={startFakeCall}
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
              <Pressable
                key={action.id}
                style={styles.quickAction}
                onPress={() => {
                  if (action.id === 'connectWatch') {
                    router.push('/watch');
                    return;
                  }

                  if (action.id === 'snap') {
                    router.push('/snap');
                    return;
                  }

                  if (action.id === 'siren') {
                    void startSiren();
                    return;
                  }

                  if (action.id === 'addContact') {
                    openAddContact();
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel}>
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
              <View key={contact.id} style={styles.contactCard}>
                <View style={[styles.avatar, { backgroundColor: contact.avatar }]}>
                  <Text style={styles.avatarText}>{contact.initials}</Text>
                </View>

                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                  {contact.relationship ? <Text style={styles.contactRelationship}>{contact.relationship}</Text> : null}
                </View>

                <View style={styles.contactActions}>
                  <Pressable
                    style={styles.contactActionButton}
                    onPress={() => openContactChat(contact)}
                    accessibilityRole="button"
                    accessibilityLabel={`Message ${contact.name}`}>
                    <MaterialCommunityIcons name="message-text-outline" size={18} color="#C84D61" />
                  </Pressable>
                  <Pressable
                    style={styles.contactActionButton}
                    onPress={() => Alert.alert('Call contact', 'Use the fake call button to open the emergency call UI.')}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${contact.name}`}>
                    <MaterialCommunityIcons name="phone" size={18} color="#C84D61" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showIncomingCall}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={endFakeCall}>
        <View style={styles.callOverlayContainer}>
          <BlurView
            intensity={35}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.callOverlayScrim} />
          <View style={styles.callOverlayGlowOne} />
          <View style={styles.callOverlayGlowTwo} />

          <View style={styles.callSheet}>
            <View style={styles.callStatusPill}>
              <View style={[styles.callStatusDot, !isCallAnswered && styles.callStatusDotRinging]} />
              <Text style={styles.callStatusText}>{isCallAnswered ? 'CALL CONNECTED' : 'INCOMING CALL'}</Text>
            </View>

            <Animated.View
              style={[
                styles.callAvatarRing,
                !isCallAnswered && {
                  opacity: callPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
                  transform: [
                    {
                      scale: callPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }),
                    },
                  ],
                },
              ]}>
              <View style={styles.callAvatarCore}>
                <Text style={styles.callAvatarText}>{fakeCallerName.split(' ').map((part) => part[0] || '').join('').toUpperCase()}</Text>
              </View>
            </Animated.View>

            <Text style={styles.callName}>{fakeCallerName}</Text>
            <Text style={styles.callNumber}>{fakeCallerNumber}</Text>
            <Text style={styles.callLabel}>{isCallAnswered ? `Connected for ${String(Math.floor(callElapsedSeconds / 60)).padStart(2, '0')}:${String(callElapsedSeconds % 60).padStart(2, '0')}` : 'Incoming call from Her Shield emergency line'}</Text>

            <View style={styles.callActionsRow}>
              <Pressable
                style={styles.callActionButtonReject}
                onPress={endFakeCall}
                accessibilityRole="button"
                accessibilityLabel="Reject call">
                <MaterialCommunityIcons name="phone-hangup" size={28} color="#FFFFFF" />
                <Text style={styles.callActionText}>Decline</Text>
              </Pressable>

              {isCallAnswered ? (
                <Pressable
                  style={styles.callActionButtonReject}
                  onPress={endFakeCall}
                  accessibilityRole="button"
                  accessibilityLabel="End call">
                  <MaterialCommunityIcons name="phone-off" size={28} color="#FFFFFF" />
                  <Text style={styles.callActionText}>End</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.callActionButtonAnswer}
                  onPress={answerFakeCall}
                  accessibilityRole="button"
                  accessibilityLabel="Answer call">
                  <MaterialCommunityIcons name="phone" size={30} color="#FFFFFF" />
                  <Text style={styles.callActionText}>Answer</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddContactModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowAddContactModal(false)}>
        <View style={styles.addContactOverlay}>
          <BlurView
            intensity={25}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.addContactScrim} />

          <View style={styles.addContactCard}>
            <View style={styles.addContactHeader}>
              <View style={styles.addContactIconWrap}>
                <MaterialCommunityIcons name="account-plus" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.addContactHeaderText}>
                <Text style={styles.addContactTitle}>Add contact</Text>
                <Text style={styles.addContactSubtitle}>Save a trusted emergency contact to your account.</Text>
              </View>
            </View>

            <View style={styles.addContactForm}>
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder="Contact name"
                placeholderTextColor="#A46A74"
                style={styles.addContactInput}
              />
              <TextInput
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="Phone number"
                placeholderTextColor="#A46A74"
                style={styles.addContactInput}
                keyboardType="phone-pad"
              />
              <TextInput
                value={contactRelationship}
                onChangeText={setContactRelationship}
                placeholder="Relationship"
                placeholderTextColor="#A46A74"
                style={styles.addContactInput}
              />
            </View>

            {contactError ? <Text style={styles.addContactError}>{contactError}</Text> : null}

            <View style={styles.addContactFooter}>
              <Pressable style={styles.addContactSecondaryButton} onPress={() => setShowAddContactModal(false)} accessibilityRole="button">
                <Text style={styles.addContactSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.addContactPrimaryButton, isSavingContact && { opacity: 0.7 }]}
                onPress={() => void handleAddContact()}
                accessibilityRole="button"
                disabled={isSavingContact}>
                <Text style={styles.addContactPrimaryText}>{isSavingContact ? 'Saving...' : 'Save contact'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSirenOverlay}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => {
          setSirenPasswordError('Enter the cancel password to stop the siren.');
        }}>
        <View style={styles.sirenOverlayContainer}>
          <BlurView
            intensity={30}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sirenOverlayScrim} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sirenOverlayContent}>
            <View style={styles.sirenCard}>
              <View style={styles.sirenHeaderRow}>
                <View style={styles.sirenIconWrap}>
                  <MaterialCommunityIcons name="alarm-light" size={22} color="#FFFFFF" />
                </View>
                <View style={styles.sirenHeaderTextWrap}>
                  <Text style={styles.sirenTitle}>Siren active</Text>
                  <Text style={styles.sirenSubtitle}>A loud remote alarm is playing to alert nearby people.</Text>
                </View>
              </View>

              <View style={styles.sirenStatusStrip}>
                <View style={styles.sirenStatusDot} />
                <Text style={styles.sirenStatusText}>LOUD ALARM LIVE</Text>
                <Text style={styles.sirenStatusTime}>{String(Math.floor(sirenElapsedSeconds / 60)).padStart(2, '0')}:{String(sirenElapsedSeconds % 60).padStart(2, '0')}</Text>
              </View>

              <Text style={styles.sirenBodyText}>
                Enter the cancel password to stop the sound. The siren will keep looping until the correct password is provided.
              </Text>

              <View style={styles.sirenInputWrap}>
                <Text style={styles.sirenInputLabel}>Cancel password</Text>
                <TextInput
                  value={sirenPasswordInput}
                  onChangeText={(nextValue) => {
                    setSirenPasswordInput(nextValue);
                    if (sirenPasswordError) {
                      setSirenPasswordError('');
                    }
                  }}
                  secureTextEntry={true}
                  placeholder="Enter password"
                  placeholderTextColor="#B89BA3"
                  style={styles.sirenInput}
                />
                {sirenPasswordError ? <Text style={styles.sirenError}>{sirenPasswordError}</Text> : null}
              </View>

              <Pressable style={styles.sirenStopButton} onPress={() => void stopSiren()} accessibilityRole="button">
                <Text style={styles.sirenStopButtonText}>Stop siren</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
  sirenOverlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sirenOverlayScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 12, 17, 0.48)',
  },
  sirenOverlayContent: {
    width: '100%',
    maxWidth: 360,
  },
  sirenCard: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.99)',
    padding: 18,
    gap: 14,
    shadowColor: '#7A2434',
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  sirenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sirenIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C84D61',
  },
  sirenHeaderTextWrap: {
    flex: 1,
    gap: 2,
  },
  sirenTitle: {
    color: '#1D1D1F',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  sirenSubtitle: {
    color: '#7A6168',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  sirenStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#C84D61',
  },
  sirenStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  sirenStatusText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  sirenStatusTime: {
    color: '#FFF0F3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sirenBodyText: {
    color: '#6E5A60',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  sirenInputWrap: {
    gap: 8,
  },
  sirenInputLabel: {
    color: '#1D1D1F',
    fontSize: 13,
    fontWeight: '800',
  },
  sirenInput: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#FFF8F9',
    borderWidth: 1,
    borderColor: 'rgba(200,77,97,0.14)',
    paddingHorizontal: 14,
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '700',
  },
  sirenError: {
    color: '#B84A5A',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  sirenStopButton: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D1D1F',
  },
  sirenStopButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
  callOverlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  callOverlayScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 10, 17, 0.55)',
  },
  callOverlayGlowOne: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  callOverlayGlowTwo: {
    position: 'absolute',
    bottom: -80,
    left: -70,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  callSheet: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 14,
  },
  callStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  callStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#76D38C',
  },
  callStatusDotRinging: {
    backgroundColor: '#F7D86C',
  },
  callStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  callAvatarRing: {
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 10,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  callAvatarCore: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C84D61',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  callAvatarText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  callName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  callNumber: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  callLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  callActionsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 10,
  },
  callActionButtonReject: {
    flex: 1,
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: '#D94A5E',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  callActionButtonAnswer: {
    flex: 1,
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: '#38B46B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  callActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
  contactRelationship: {
    color: '#B84A5A',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
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
  addContactOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addContactScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 12, 17, 0.34)',
  },
  addContactCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.98)',
    padding: 18,
    gap: 14,
    shadowColor: '#7A2434',
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  addContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addContactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C84D61',
  },
  addContactHeaderText: {
    flex: 1,
    gap: 2,
  },
  addContactTitle: {
    color: '#1D1D1F',
    fontSize: 22,
    fontWeight: '900',
  },
  addContactSubtitle: {
    color: '#7A6168',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  addContactForm: {
    gap: 10,
  },
  addContactInput: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#FFF8F9',
    borderWidth: 1,
    borderColor: 'rgba(200,77,97,0.14)',
    paddingHorizontal: 14,
    color: '#1D1D1F',
    fontSize: 15,
    fontWeight: '700',
  },
  addContactError: {
    color: '#B84A5A',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  addContactFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  addContactSecondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7EDEF',
  },
  addContactSecondaryText: {
    color: '#B84A5A',
    fontSize: 15,
    fontWeight: '800',
  },
  addContactPrimaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C84D61',
  },
  addContactPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
