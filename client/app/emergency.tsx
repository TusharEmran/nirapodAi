import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { sendEmergencySOS } from '@/lib/auth-api';
import { useAuth } from '@/providers/auth-provider';

// Contact positions are now relative to ring center (145, 145)
// so they actually orbit the center circle correctly
const contacts = [
    { id: '1', cx: -80, cy: -95, size: 42 },
    { id: '2', cx: 100, cy: -40, size: 58 },
    { id: '3', cx: 108, cy: 58, size: 36 },
    { id: '4', cx: -80, cy: 80, size: 26 },
    { id: '5', cx: -40, cy: 98, size: 34 },
] as const;

const RING = 145; // half of contactRing width (290)

export default function EmergencyScreen() {
    const router = useRouter();
    const { token, user } = useAuth();
    const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
    const initialCountdown = user?.safetySettings?.sosCountdownSeconds ?? 10;
    const [countdown, setCountdown] = useState(initialCountdown);
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const hasSentSosRef = useRef(false);
    const infoRowAnimations = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    const cameraRef = useRef<any>(null);
    const isCapturingRef = useRef(false);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions({ writeOnly: true });
    const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
    const [cameraReady, setCameraReady] = useState(false);

    useEffect(() => {
        void requestCameraPermission();
        void requestMediaPermission();
    }, []);

    const latitude = Number(params.latitude);
    const longitude = Number(params.longitude);

    useEffect(() => {
        if (hasSentSosRef.current) {
            return;
        }

        const nextCountdown = user?.safetySettings?.sosCountdownSeconds ?? 10;
        setCountdown(nextCountdown);
    }, [user]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((currentValue) => {
                if (currentValue <= 0) {
                    clearInterval(timer);
                    return 0;
                }

                return currentValue - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let isStale = false;

        const capturePhoto = async () => {
            if (countdown > 0 && !hasSentSosRef.current && cameraRef.current && cameraReady && cameraPermission?.granted && mediaPermission?.granted) {
                if (isCapturingRef.current) return;
                isCapturingRef.current = true;
                
                try {
                    // quality 0.3 for faster capture and processing, silent shutter
                    const photo = await cameraRef.current.takePictureAsync({ quality: 0.3, shutterSound: false });
                    if (photo?.uri) {
                        await MediaLibrary.saveToLibraryAsync(photo.uri);
                        setCameraReady(false);
                        // Delay camera switch slightly to allow hardware to reset
                        setTimeout(() => {
                            setCameraFacing(prev => prev === 'back' ? 'front' : 'back');
                        }, 300);
                    }
                } catch (e) {
                    // Ignore capture errors during rapid camera switching
                } finally {
                    isCapturingRef.current = false;
                }
            }
        };

        void capturePhoto();

        return () => {
            isStale = true;
        };
    }, [countdown, cameraPermission?.granted, mediaPermission?.granted, cameraReady]);

    useEffect(() => {
        if (countdown !== 0 || hasSentSosRef.current) {
            return;
        }

        hasSentSosRef.current = true;

        let cancelled = false;

        const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
            let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

            try {
                return await Promise.race([
                    promise,
                    new Promise<T>((_, reject) => {
                        timeoutHandle = setTimeout(() => reject(new Error('SOS request timed out. Please try again.')), timeoutMs);
                    }),
                ]);
            } finally {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
            }
        };

        const triggerSOS = async () => {
            try {
                setIsSending(true);
                setSendError('');

                let liveLatitude = latitude;
                let liveLongitude = longitude;

                if (!Number.isFinite(liveLatitude) || !Number.isFinite(liveLongitude)) {
                    const permissions = await Location.getForegroundPermissionsAsync();
                    const nextPermissions = permissions.status === 'granted'
                        ? permissions
                        : await Location.requestForegroundPermissionsAsync();

                    if (nextPermissions.status !== 'granted') {
                        throw new Error('Location permission is required to send the SOS alert.');
                    }

                    const position = await Location.getCurrentPositionAsync({});
                    liveLatitude = position.coords.latitude;
                    liveLongitude = position.coords.longitude;
                }

                if (!token) {
                    throw new Error('Sign in again to send SOS alerts.');
                }

                await withTimeout(
                    sendEmergencySOS(token, {
                        latitude: liveLatitude,
                        longitude: liveLongitude,
                    }),
                    15000,
                );

                if (cancelled) {
                    return;
                }

                router.replace('/(tabs)');
            } catch (error) {
                if (cancelled) {
                    return;
                }

                const message = error instanceof Error ? error.message : 'Unable to send SOS right now.';
                setSendError(message);
                Alert.alert('SOS failed', message);
            } finally {
                if (!cancelled) {
                    setIsSending(false);
                }
            }
        };

        void triggerSOS();

        return () => {
            cancelled = true;
        };
    }, [countdown, latitude, longitude, router, token]);

    useEffect(() => {
        Animated.stagger(
            320,
            infoRowAnimations.map((animation) =>
                Animated.timing(animation, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ),
        ).start();
    }, [infoRowAnimations]);

    const infoRowStyle = (animation: Animated.Value) => ({
        opacity: animation,
        transform: [
            {
                translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                }),
            },
        ],
    });

    return (
        <View style={styles.screen}>
            {cameraPermission?.granted ? (
                <View style={{ position: 'absolute', top: -10000, left: 0, width: 400, height: 400 }}>
                    <CameraView
                        ref={cameraRef}
                        facing={cameraFacing}
                        style={{ flex: 1 }}
                        onCameraReady={() => setCameraReady(true)}
                    />
                </View>
            ) : null}
            <View 
                style={[styles.contentContainer, { flex: 1, width: '100%' }]}
            >
                <View style={styles.topBar}>
                    <Pressable
                        onPress={() => router.replace('/(tabs)')}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <MaterialCommunityIcons name="chevron-left" size={28} color="#FAFAFA" />
                    </Pressable>
                </View>

            <View style={styles.circleSection}>
                <View style={styles.contactRing}>
                    <View style={styles.contactOrbit} />
                    <View style={styles.contactCenter}>
                        <Text style={styles.countdown}>{countdown}</Text>
                    </View>

                    {/* Icons placed on the orbit ring using trig-friendly offsets */}
                    <View style={[styles.orbitIcon, { top: RING - 5 - 14, left: RING - 105 - 14 }]}>
                        <MaterialCommunityIcons name="map-marker" size={20} color="#EF4444" />
                    </View>
                    <View style={[styles.orbitIcon, { top: RING + 90 - 10, left: RING + 70 - 10 }]}>
                        <MaterialCommunityIcons name="chat" size={18} color="#EF4444" />
                    </View>

                    {contacts.map((c) => (
                        <View
                            key={c.id}
                            style={[
                                styles.contactAvatar,
                                {
                                    // offset from ring center so avatars visually orbit
                                    left: RING + c.cx - c.size / 2,
                                    top: RING + c.cy - c.size / 2,
                                    width: c.size,
                                    height: c.size,
                                    borderRadius: c.size / 2,
                                },
                            ]}
                        />
                    ))}
                </View>
            </View>

            <View style={styles.infoList}>
                <Animated.View style={[styles.infoRow, infoRowStyle(infoRowAnimations[0])]}>
                    <View style={styles.checkCircle}>
                        <MaterialCommunityIcons name="check" size={16} color="#10B981" />
                    </View>
                    <Text style={styles.infoText}>
                        Your contacts have been informed you are in danger
                    </Text>
                </Animated.View>

                <Animated.View style={[styles.infoRow, infoRowStyle(infoRowAnimations[1])]}>
                    <View style={styles.checkCircle}>
                        <MaterialCommunityIcons name="check" size={16} color="#10B981" />
                    </View>
                    <Text style={styles.infoText}>You are sharing your live location</Text>
                </Animated.View>

                <Animated.View style={[styles.infoRow, infoRowStyle(infoRowAnimations[2])]}>
                    <View style={styles.checkCircle}>
                        <MaterialCommunityIcons name="check" size={16} color="#10B981" />
                    </View>
                    <Text style={styles.infoText}>Authorities will contact you soon</Text>
                </Animated.View>
            </View>

            <Pressable style={styles.callButton} accessibilityRole="button">
                <Text style={styles.callButtonText}>{isSending ? 'Sending SOS...' : 'Call 122'}</Text>
            </Pressable>

            <Pressable style={styles.cancelButton} accessibilityRole="button" onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#09090B',
    },
    contentContainer: {
        paddingTop: 40, // Reduced from 54
        paddingHorizontal: 20,
        paddingBottom: 20, // Reduced padding
        alignItems: 'center',
    },
    topBar: {
        width: '100%',
        minHeight: 50,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
    },
    circleSection: {
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
    },
    contactRing: {
        width: 300,
        height: 300,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    contactOrbit: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 2,
        borderColor: 'rgba(239, 68, 68, 0.4)',
        borderStyle: 'dashed',
    },
    contactCenter: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 4,
        borderColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EF4444',
        shadowOpacity: 0.8,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
        elevation: 15,
    },
    countdown: {
        color: '#FAFAFA',
        fontSize: 76,
        fontWeight: '900',
        lineHeight: 82,
    },
    orbitIcon: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#18181B',
        borderWidth: 2,
        borderColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactAvatar: {
        position: 'absolute',
        backgroundColor: '#18181B',
        borderWidth: 2,
        borderColor: '#27272A',
    },
    infoList: {
        width: '100%',
        gap: 10, // Reduced from 16
        marginTop: 12, // Reduced from 20
        paddingHorizontal: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#18181B',
        padding: 12, // Reduced from 16
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 1,
        borderColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoText: {
        flex: 1,
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
    },
    callButton: {
        marginTop: 20, // Reduced from 32
        width: '100%',
        minHeight: 52, // Reduced from 56
        borderRadius: 999,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#EF4444',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    callButtonText: {
        color: '#FAFAFA',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cancelButton: {
        marginTop: 12, // Reduced from 16
        width: '100%',
        minHeight: 52, // Reduced from 56
        borderRadius: 999,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#A1A1AA',
        fontSize: 16,
        fontWeight: '800',
    },
    errorText: {
        marginTop: 16,
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
    },
});
