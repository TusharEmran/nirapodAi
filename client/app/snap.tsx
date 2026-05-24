import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const recipients = [
    { id: '1', name: 'Mom', subtitle: 'Trusted contact', avatar: '#7AB0C0' },
    { id: '2', name: 'Emergency Contact', subtitle: 'Live location on', avatar: '#C84D61' },
    { id: '3', name: 'Police Hotline', subtitle: 'Assigned officer', avatar: '#6E7BA8' },
    { id: '4', name: 'Best Friend', subtitle: 'On the way', avatar: '#C9A56C' },
] as const;

export default function SnapScreen() {
    const router = useRouter();
    const cameraRef = useRef<CameraView | null>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraReady, setCameraReady] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [lastSentRecipient, setLastSentRecipient] = useState<string | null>(null);
    const facing: CameraType = 'back';

    const takeSnap = async () => {
        if (!cameraRef.current || isCapturing || !cameraReady) {
            return;
        }

        setIsCapturing(true);

        try {
            const captured = await cameraRef.current.takePictureAsync({ quality: 0.85 });
            setPhotoUri(captured.uri);
            setLastSentRecipient(null);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } finally {
            setIsCapturing(false);
        }
    };

    const retakeSnap = () => {
        setPhotoUri(null);
        setLastSentRecipient(null);
    };

    const sendSnap = async (recipientId: string) => {
        if (!photoUri) {
            return;
        }

        const recipient = recipients.find((entry) => entry.id === recipientId);

        if (!recipient) {
            return;
        }

        setLastSentRecipient(recipient.name);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push(`/chat/${recipient.id}?photoUri=${encodeURIComponent(photoUri)}`);
    };

    if (!permission) {
        return <View style={styles.loadingScreen} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionScreen}>
                <View style={styles.permissionCard}>
                    <View style={styles.permissionIcon}>
                        <MaterialCommunityIcons name="camera" size={24} color="#C84D61" />
                    </View>
                    <Text style={styles.title}>Camera access needed</Text>
                    <Text style={styles.subtitle}>
                        Grant camera permission to take a snap and send it directly to your contacts.
                    </Text>
                    <Pressable style={styles.primaryButton} onPress={() => void requestPermission()} accessibilityRole="button">
                        <Text style={styles.primaryButtonText}>Allow camera</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={styles.topBar}>
                <Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#C84D61" />
                </Pressable>

                <View style={styles.topBarTitleWrap}>
                    <Text style={styles.kicker}>Her Shield</Text>
                    <Text style={styles.headerTitle}>Snap and send</Text>
                </View>

                <View style={styles.iconButton}>
                    <MaterialCommunityIcons name="image-multiple-outline" size={20} color="#C84D61" />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

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
                        <View style={styles.cornerTopLeft} />
                        <View style={styles.cornerTopRight} />
                        <View style={styles.cornerBottomLeft} />
                        <View style={styles.cornerBottomRight} />
                    </View>

                    <View style={styles.cameraBadge}>
                        <MaterialCommunityIcons name="radiobox-marked" size={12} color="#FFFFFF" />
                        <Text style={styles.cameraBadgeText}>Live capture</Text>
                    </View>
                </View>

                <View style={styles.controlsRow}>
                    {photoUri ? (
                        <>
                            <Pressable style={styles.secondaryButton} onPress={retakeSnap} accessibilityRole="button">
                                <MaterialCommunityIcons name="camera-retake" size={18} color="#C84D61" />
                                <Text style={styles.secondaryButtonText}>Retake</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                                onPress={() => void takeSnap()}
                                disabled={isCapturing}
                                accessibilityRole="button"
                            >
                                {isCapturing ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons name="camera" size={22} color="#FFFFFF" />}
                            </Pressable>
                        </>
                    ) : (
                        <Pressable
                            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                            onPress={() => void takeSnap()}
                            disabled={isCapturing}
                            accessibilityRole="button"
                        >
                            {isCapturing ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons name="camera-iris" size={24} color="#FFFFFF" />}
                        </Pressable>
                    )}
                </View>

                {photoUri ? (
                    <View style={styles.sendPanel}>
                        <View style={styles.sendPanelHeader}>
                            <Text style={styles.sectionTitle}>Send to contacts</Text>
                            <Text style={styles.sendPanelSubtitle}>Tap a contact to send this snap directly.</Text>
                        </View>

                        {lastSentRecipient ? (
                            <View style={styles.sentBanner}>
                                <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
                                <Text style={styles.sentBannerText}>Sent to {lastSentRecipient}</Text>
                            </View>
                        ) : null}

                        {recipients.map((recipient) => (
                            <Pressable
                                key={recipient.id}
                                style={styles.recipientCard}
                                onPress={() => void sendSnap(recipient.id)}
                                accessibilityRole="button"
                            >
                                <View style={[styles.recipientAvatar, { backgroundColor: recipient.avatar }]}>
                                    <Text style={styles.recipientInitial}>{recipient.name.slice(0, 1)}</Text>
                                </View>

                                <View style={styles.recipientInfo}>
                                    <Text style={styles.recipientName}>{recipient.name}</Text>
                                    <Text style={styles.recipientSubtitle}>{recipient.subtitle}</Text>
                                </View>

                                <View style={styles.recipientAction}>
                                    <MaterialCommunityIcons name="send" size={16} color="#C84D61" />
                                    <Text style={styles.recipientActionText}>Send</Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                ) : (
                    <View style={styles.tipCard}>
                        <MaterialCommunityIcons name="gesture-tap-button" size={18} color="#C84D61" />
                        <Text style={styles.tipText}>Take a snap first, then choose who to send it to.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#C84D61',
        paddingTop: 42,
    },
    loadingScreen: {
        flex: 1,
        backgroundColor: '#C84D61',
    },
    permissionScreen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#C84D61',
        padding: 20,
    },
    permissionCard: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 30,
        backgroundColor: '#FFFDFD',
        padding: 22,
        gap: 12,
        alignItems: 'center',
    },
    permissionIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#F4D7DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: '#1D1D1F',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.4,
    },
    subtitle: {
        color: '#6E5A60',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    primaryButton: {
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: '#C84D61',
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        marginTop: 4,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 18,
        paddingBottom: 16,
    },
    topBarTitleWrap: {
        flex: 1,
    },
    kicker: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.4,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: '#FFFDFD',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 18,
        paddingBottom: 28,
        gap: 16,
    },
    heroCard: {
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.12)',
        padding: 18,
        gap: 8,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.4,
    },
    heroText: {
        color: 'rgba(255,255,255,0.88)',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    cameraFrame: {
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: '#1D1D1F',
        height: 430,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
    },
    preview: {
        width: '100%',
        height: '100%',
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    cornerTopLeft: {
        position: 'absolute',
        top: 14,
        left: 14,
        width: 28,
        height: 28,
        borderLeftWidth: 3,
        borderTopWidth: 3,
        borderColor: '#FFFFFF',
        opacity: 0.9,
    },
    cornerTopRight: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 28,
        height: 28,
        borderRightWidth: 3,
        borderTopWidth: 3,
        borderColor: '#FFFFFF',
        opacity: 0.9,
    },
    cornerBottomLeft: {
        position: 'absolute',
        bottom: 14,
        left: 14,
        width: 28,
        height: 28,
        borderLeftWidth: 3,
        borderBottomWidth: 3,
        borderColor: '#FFFFFF',
        opacity: 0.9,
    },
    cornerBottomRight: {
        position: 'absolute',
        bottom: 14,
        right: 14,
        width: 28,
        height: 28,
        borderRightWidth: 3,
        borderBottomWidth: 3,
        borderColor: '#FFFFFF',
        opacity: 0.9,
    },
    cameraBadge: {
        position: 'absolute',
        top: 14,
        left: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(29,29,31,0.56)',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    cameraBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.7,
        textTransform: 'uppercase',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    captureButton: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#1D1D1F',
        borderWidth: 6,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureButtonDisabled: {
        opacity: 0.7,
    },
    secondaryButton: {
        minHeight: 56,
        borderRadius: 18,
        backgroundColor: '#FFFDFD',
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    secondaryButtonText: {
        color: '#C84D61',
        fontSize: 14,
        fontWeight: '800',
    },
    sendPanel: {
        borderRadius: 28,
        backgroundColor: '#FFFDFD',
        padding: 16,
        gap: 12,
    },
    sendPanelHeader: {
        gap: 4,
    },
    sectionTitle: {
        color: '#1D1D1F',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    sendPanelSubtitle: {
        color: '#7A6168',
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    sentBanner: {
        borderRadius: 16,
        backgroundColor: '#77A97A',
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sentBannerText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    recipientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 20,
        backgroundColor: '#F7ECEE',
        padding: 12,
    },
    recipientAvatar: {
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recipientInitial: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
    },
    recipientInfo: {
        flex: 1,
        gap: 2,
    },
    recipientName: {
        color: '#1D1D1F',
        fontSize: 15,
        fontWeight: '800',
    },
    recipientSubtitle: {
        color: '#7A6168',
        fontSize: 12,
        fontWeight: '600',
    },
    recipientAction: {
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    recipientActionText: {
        color: '#C84D61',
        fontSize: 13,
        fontWeight: '800',
    },
    tipCard: {
        borderRadius: 24,
        backgroundColor: '#F7ECEE',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    tipText: {
        flex: 1,
        color: '#6E5A60',
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
    },
});