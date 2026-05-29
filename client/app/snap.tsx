import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { fetchContacts, type EmergencyContact, uploadMedia } from '@/lib/auth-api';

export default function SnapScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const cameraRef = useRef<CameraView | null>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraReady, setCameraReady] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const sendingRecipientIdRef = useRef<string | null>(null);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [lastSentRecipient, setLastSentRecipient] = useState<string | null>(null);
    const [sendError, setSendError] = useState('');
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const facing: CameraType = 'back';

    const appRecipients = useMemo(() => contacts.filter((contact) => contact.isAppUser), [contacts]);

    useEffect(() => {
        if (!token) {
            setContacts([]);
            return;
        }

        let mounted = true;

        const loadContacts = async () => {
            try {
                const response = await fetchContacts(token);
                if (mounted) {
                    setContacts(response.contacts);
                }
            } catch {
                if (mounted) {
                    setContacts([]);
                }
            }
        };

        void loadContacts();

        return () => {
            mounted = false;
        };
    }, [token]);

    const takeSnap = async () => {
        if (!cameraRef.current || isCapturing || !cameraReady) {
            return;
        }

        setIsCapturing(true);

        try {
            const captured = await cameraRef.current.takePictureAsync({ quality: 0.85 });
            if (captured?.uri) {
                setPhotoUri(captured.uri);
                setLastSentRecipient(null);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } finally {
            setIsCapturing(false);
        }
    };

    const retakeSnap = () => {
        setPhotoUri(null);
        setLastSentRecipient(null);
        setSendError('');
    };

    const sendSnap = async (recipient: EmergencyContact) => {
        if (isSending || sendingRecipientIdRef.current) {
            return;
        }

        if (!photoUri) {
            return;
        }

        if (!token) {
            setSendError('Sign in again to send snaps.');
            return;
        }

        if (!recipient.isAppUser) {
            Alert.alert('Not on the app', `${recipient.name} is not a Sentinel AI user yet.`);
            return;
        }

        let didNavigate = false;

        try {
            sendingRecipientIdRef.current = recipient.id;
            setIsSending(true);
            setSendError('');

            const uploaded = await uploadMedia(token, photoUri, 'nirapodai/snaps');
            const uploadedUrl = uploaded.url?.trim();

            if (!uploadedUrl) {
                throw new Error('The snap uploaded, but no image URL was returned.');
            }

            setLastSentRecipient(recipient.name);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            didNavigate = true;
            router.push(
                `/chat/${recipient.id}?photoUri=${encodeURIComponent(photoUri)}&imageUrl=${encodeURIComponent(uploadedUrl)}`,
            );
        } catch (error) {
            setSendError(error instanceof Error ? error.message : 'Unable to send this snap right now.');
        } finally {
            if (!didNavigate) {
                sendingRecipientIdRef.current = null;
                setIsSending(false);
            }
        }
    };

    if (!permission) {
        return <View style={styles.loadingScreen} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionScreen}>
                <View style={styles.permissionCard}>
                    <View style={styles.permissionIcon}>
                        <MaterialCommunityIcons name="camera" size={32} color="#FAFAFA" />
                    </View>
                    <Text style={styles.permissionTitle}>Camera access needed</Text>
                    <Text style={styles.permissionSubtitle}>Grant camera permission to capture stealth evidence and send it securely.</Text>
                    <Pressable style={styles.permissionButton} onPress={() => void requestPermission()} accessibilityRole="button">
                        <Text style={styles.permissionButtonText}>Allow camera</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            {/* Dark Mode Top Nav */}
            <View style={styles.topBar}>
                <Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityRole="button">
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#FAFAFA" />
                </Pressable>
                <View style={styles.topBarCenter}>
                    <Text style={styles.kicker}>Stealth Mode</Text>
                    <Text style={styles.headerTitle}>Evidence Capture</Text>
                </View>
                <View style={[styles.iconButton, { backgroundColor: 'transparent', borderWidth: 0 }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Advanced Camera Viewfinder */}
                <View style={styles.cameraWrapper}>
                    <View style={styles.cameraFrame}>
                        {photoUri ? (
                            <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
                        ) : (
                            <CameraView
                                ref={cameraRef}
                                style={styles.preview}
                                facing={facing}
                                mode="picture"
                                onCameraReady={() => setCameraReady(true)}
                            />
                        )}

                        <View style={styles.cameraOverlay} pointerEvents="none">
                            {/* Target brackets for stealth look */}
                            <View style={[styles.targetBracket, styles.bracketTopLeft]} />
                            <View style={[styles.targetBracket, styles.bracketTopRight]} />
                            <View style={[styles.targetBracket, styles.bracketBottomLeft]} />
                            <View style={[styles.targetBracket, styles.bracketBottomRight]} />
                        </View>

                        <View style={styles.statusBadge}>
                            <View style={[styles.statusDot, photoUri && { backgroundColor: '#F59E0B' }]} />
                            <Text style={styles.statusBadgeText}>{photoUri ? 'Captured' : 'Live'}</Text>
                        </View>
                    </View>

                    {/* Camera Controls */}
                    <View style={styles.controlsRow}>
                        {photoUri ? (
                            <>
                                <Pressable style={styles.retakeButton} onPress={retakeSnap} accessibilityRole="button">
                                    <MaterialCommunityIcons name="refresh" size={24} color="#A1A1AA" />
                                </Pressable>
                                <Pressable style={styles.primaryActionButton} disabled>
                                    <MaterialCommunityIcons name="check" size={28} color="#09090B" />
                                </Pressable>
                            </>
                        ) : (
                            <View style={styles.shutterRing}>
                                <Pressable
                                    style={[styles.shutterButton, isCapturing && styles.shutterButtonActive]}
                                    onPress={() => void takeSnap()}
                                    disabled={isCapturing}
                                    accessibilityRole="button"
                                >
                                    {isCapturing && <ActivityIndicator color="#09090B" />}
                                </Pressable>
                            </View>
                        )}
                    </View>
                </View>

                {/* Secure Send Panel */}
                {photoUri ? (
                    <View style={styles.sendPanel}>
                        <View style={styles.panelHeader}>
                            <MaterialCommunityIcons name="shield-lock" size={20} color="#71717A" />
                            <Text style={styles.panelTitle}>Secure Transmission</Text>
                        </View>
                        <Text style={styles.panelSubtitle}>Select an emergency contact to send this encrypted evidence instantly.</Text>

                        {lastSentRecipient && (
                            <View style={styles.successBanner}>
                                <MaterialCommunityIcons name="check-circle" size={18} color="#FAFAFA" />
                                <Text style={styles.successBannerText}>Sent securely to {lastSentRecipient}</Text>
                            </View>
                        )}

                        <View style={styles.contactsList}>
                            {contacts.map((recipient) => (
                                <Pressable
                                    key={recipient.id}
                                    style={[styles.contactCard, isSending && styles.contactCardDisabled]}
                                    onPress={() => void sendSnap(recipient)}
                                    disabled={isSending}
                                    accessibilityRole="button"
                                >
                                    <View style={[styles.avatar, { backgroundColor: recipient.avatar }]}>
                                        <Text style={styles.avatarInitial}>{recipient.initials}</Text>
                                    </View>

                                    <View style={styles.contactInfo}>
                                        <Text style={styles.contactName}>{recipient.name}</Text>
                                        <Text style={styles.contactSub}>{recipient.relationship || recipient.phone}</Text>
                                    </View>

                                    <View style={[styles.sendAction, !recipient.isAppUser && styles.sendActionDisabled]}>
                                        <MaterialCommunityIcons name={recipient.isAppUser ? 'send' : 'close'} size={14} color={recipient.isAppUser ? '#FAFAFA' : '#71717A'} />
                                        <Text style={[styles.sendActionText, !recipient.isAppUser && { color: '#71717A' }]}>
                                            {recipient.isAppUser ? (isSending ? 'Sending...' : 'Send') : 'Not joined'}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>

                        {contacts.length > 0 && appRecipients.length === 0 && (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="account-alert" size={24} color="#71717A" />
                                <Text style={styles.emptyStateText}>None of your contacts have installed the app. They must install it to receive secure evidence.</Text>
                            </View>
                        )}

                        {sendError ? <Text style={styles.errorText}>{sendError}</Text> : null}
                    </View>
                ) : (
                    <View style={styles.instructionBanner}>
                        <MaterialCommunityIcons name="information" size={20} color="#71717A" />
                        <Text style={styles.instructionText}>Capture evidence discreetly. Images are not saved to your local camera roll.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#09090B',
        paddingTop: 48,
    },
    loadingScreen: {
        flex: 1,
        backgroundColor: '#09090B',
    },
    permissionScreen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090B',
        padding: 24,
    },
    permissionCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 32,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 24,
        gap: 16,
        alignItems: 'center',
    },
    permissionIcon: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionTitle: {
        color: '#FAFAFA',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    permissionSubtitle: {
        color: '#A1A1AA',
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '600',
        textAlign: 'center',
    },
    permissionButton: {
        width: '100%',
        minHeight: 54,
        borderRadius: 16,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    permissionButtonText: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '800',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    iconButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBarCenter: {
        alignItems: 'center',
    },
    kicker: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    headerTitle: {
        color: '#FAFAFA',
        fontSize: 18,
        fontWeight: '900',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 24,
    },
    cameraWrapper: {
        gap: 20,
    },
    cameraFrame: {
        width: '100%',
        height: 460,
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: '#000000',
        borderWidth: 1,
        borderColor: '#27272A',
    },
    preview: {
        width: '100%',
        height: '100%',
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        padding: 20,
    },
    targetBracket: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    bracketTopLeft: {
        top: 24,
        left: 24,
        borderTopWidth: 2,
        borderLeftWidth: 2,
    },
    bracketTopRight: {
        top: 24,
        right: 24,
        borderTopWidth: 2,
        borderRightWidth: 2,
    },
    bracketBottomLeft: {
        bottom: 24,
        left: 24,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
    },
    bracketBottomRight: {
        bottom: 24,
        right: 24,
        borderBottomWidth: 2,
        borderRightWidth: 2,
    },
    statusBadge: {
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: [{ translateX: -40 }],
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
    },
    statusBadgeText: {
        color: '#FAFAFA',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        minHeight: 80,
    },
    shutterRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#FAFAFA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shutterButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shutterButtonActive: {
        backgroundColor: '#A1A1AA',
        transform: [{ scale: 0.95 }],
    },
    retakeButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryActionButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    instructionBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: '#18181B',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    instructionText: {
        flex: 1,
        color: '#A1A1AA',
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '600',
    },
    sendPanel: {
        backgroundColor: '#18181B',
        borderRadius: 32,
        padding: 20,
        borderWidth: 1,
        borderColor: '#27272A',
        gap: 16,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    panelTitle: {
        color: '#FAFAFA',
        fontSize: 18,
        fontWeight: '900',
    },
    panelSubtitle: {
        color: '#A1A1AA',
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '600',
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#22C55E',
        borderRadius: 16,
        padding: 14,
    },
    successBannerText: {
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '800',
    },
    contactsList: {
        gap: 12,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#09090B',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    contactCardDisabled: {
        opacity: 0.6,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '900',
    },
    contactInfo: {
        flex: 1,
        gap: 2,
    },
    contactName: {
        color: '#FAFAFA',
        fontSize: 15,
        fontWeight: '800',
    },
    contactSub: {
        color: '#71717A',
        fontSize: 13,
        fontWeight: '600',
    },
    sendAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#27272A',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    sendActionDisabled: {
        backgroundColor: 'transparent',
    },
    sendActionText: {
        color: '#FAFAFA',
        fontSize: 12,
        fontWeight: '800',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 12,
        backgroundColor: '#09090B',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#27272A',
        paddingHorizontal: 20,
    },
    emptyStateText: {
        color: '#71717A',
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        fontWeight: '600',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
});
