import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';

import { getMissingApiConfigMessage, ML_API_BASE_URL } from '@/lib/auth-api';

const { width } = Dimensions.get('window');

const liveMetrics = [
    {
        id: 'heart-rate',
        label: 'Heart rate',
        value: '84',
        unit: 'bpm',
        icon: 'heart-pulse',
        tone: '#EF4444', // Red
    },
    {
        id: 'blood-pressure',
        label: 'Blood pressure',
        value: '118/76',
        unit: 'mmHg',
        icon: 'blood-bag',
        tone: '#F43F5E', // Rose
    },
    {
        id: 'stress',
        label: 'Stress level',
        value: 'Low',
        unit: 'stable',
        icon: 'shield-check',
        tone: '#10B981', // Green
    },
] as const;

const recentEvents = [
    { id: '1', title: 'Baseline synced', detail: 'Vitals established', time: 'Now', type: 'sync' },
    { id: '2', title: 'Safe Audio Filter', detail: 'No distress detected', time: '14:20', type: 'audio' },
    { id: '3', title: 'Watch Paired', detail: 'Connection established', time: '14:18', type: 'device' },
] as const;

export default function WatchScreen() {
    const [isPaired, setIsPaired] = useState(false);
    const [isAlertActive, setIsAlertActive] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [recordProgress, setRecordProgress] = useState(0);

    const pulseAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (recording || isAnalyzing || isAlertActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(0);
        }
    }, [recording, isAnalyzing, isAlertActive, pulseAnim]);

    const analyzeAudio = async () => {
        if (recording || isAnalyzing) return;
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(newRecording);
            setRecordProgress(0);
            
            progressAnim.setValue(0);
            Animated.timing(progressAnim, {
                toValue: 100,
                duration: 6000,
                useNativeDriver: false,
            }).start();

            // Record for exactly 6 seconds
            setTimeout(async () => {
                try {
                    setRecording(null);
                    await newRecording.stopAndUnloadAsync();
                    const uri = newRecording.getURI();
                    if (!uri) return;

                    setIsAnalyzing(true);
                    const formData = new FormData();
                    formData.append('file', {
                        uri: uri,
                        name: 'audio.m4a',
                        type: 'audio/m4a'
                    } as any);

                    const missingConfigMessage = getMissingApiConfigMessage(ML_API_BASE_URL);
                    if (missingConfigMessage) {
                        throw new Error(missingConfigMessage);
                    }

                    const response = await fetch(`${ML_API_BASE_URL}/analyze`, {
                        method: 'POST',
                        body: formData,
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });

                    const result = await response.json();
                    setIsAnalyzing(false);
                    progressAnim.setValue(0);

                    if (result.status === 'SCREAM') {
                        setIsAlertActive(true);
                        Alert.alert(
                            'Distress Detected!',
                            `Prediction: ${result.cnn_prediction.label} (${(result.cnn_prediction.confidence * 100).toFixed(1)}%)\nSafe Sounds Filter: ${result.yamnet_context.safe_score_aggregate.toFixed(2)}`
                        );
                    } else {
                        Alert.alert('Safe', 'No distress detected in the audio.');
                        setIsAlertActive(false);
                    }
                } catch (err) {
                    setIsAnalyzing(false);
                    progressAnim.setValue(0);
                    Alert.alert('Error', 'Failed to analyze audio');
                }
            }, 6000);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    return (
        <View style={styles.screen}>
            <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Modern Status Header */}
                <View style={styles.statusBar}>
                    <View style={styles.statusLeft}>
                        <View style={styles.deviceIconBox}>
                            <MaterialCommunityIcons name="watch-variant" size={24} color="#FAFAFA" />
                        </View>
                        <View>
                            <Text style={styles.deviceName}>Sentinel Watch</Text>
                            <View style={styles.statusRow}>
                                <View style={[styles.statusDot, isPaired ? styles.statusDotActive : styles.statusDotIdle]} />
                                <Text style={styles.statusText}>{isPaired ? 'Connected • 84% Battery' : 'Not Paired'}</Text>
                            </View>
                        </View>
                    </View>
                    {!isPaired && (
                        <Pressable style={styles.pairButtonSmall} onPress={() => setIsPaired(true)}>
                            <Text style={styles.pairButtonSmallText}>Pair</Text>
                        </Pressable>
                    )}
                </View>

                {/* Primary Vitals Dashboard */}
                <View style={styles.dashboardSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Live Vitals</Text>
                        <MaterialCommunityIcons name="heart-pulse" size={20} color="#71717A" />
                    </View>
                    
                    <View style={styles.vitalsGrid}>
                        {liveMetrics.map((metric, index) => (
                            <View 
                                key={metric.id} 
                                style={[styles.vitalCard, index === 0 ? styles.vitalCardPrimary : {}]}
                            >
                                <View style={styles.vitalTop}>
                                    <View style={[styles.vitalIconWrap, { backgroundColor: `${metric.tone}1A` }]}>
                                        <MaterialCommunityIcons name={metric.icon as never} size={18} color={metric.tone} />
                                    </View>
                                    <Text style={styles.vitalLabel}>{metric.label}</Text>
                                </View>
                                <View style={styles.vitalBottom}>
                                    <Text style={styles.vitalValue}>{isPaired ? metric.value : '--'}</Text>
                                    <Text style={styles.vitalUnit}>{metric.unit}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* AI Audio Scanner Widget */}
                <View style={styles.scannerWidget}>
                    <View style={styles.scannerHeader}>
                        <View>
                            <Text style={styles.scannerTitle}>AI Audio Analysis</Text>
                            <Text style={styles.scannerSubtitle}>Detect screams or distress sounds</Text>
                        </View>
                        <MaterialCommunityIcons name="shield-check" size={24} color={isAlertActive ? '#EF4444' : '#10B981'} />
                    </View>

                    <View style={styles.scannerInteractive}>
                        <Animated.View style={[styles.scannerPulseRings, {
                            transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
                            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] })
                        }]} pointerEvents="none" />
                        
                        <Pressable 
                            style={[styles.scannerButton, recording ? styles.scannerButtonRecording : isAnalyzing ? styles.scannerButtonAnalyzing : {}]}
                            onPress={analyzeAudio}
                            disabled={!!recording || isAnalyzing}
                        >
                            <MaterialCommunityIcons 
                                name={recording ? 'microphone' : (isAnalyzing ? 'brain' : 'microphone-outline')} 
                                size={32} 
                                color="#FAFAFA" 
                            />
                        </Pressable>
                    </View>

                    <Text style={styles.scannerStatusText}>
                        {recording ? 'Listening for 6 seconds...' : isAnalyzing ? 'Running neural network...' : 'Tap to scan environment'}
                    </Text>

                    {/* Progress Bar for Recording */}
                    <View style={styles.progressBarBg}>
                        <Animated.View style={[styles.progressBarFill, {
                            width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
                        }]} />
                    </View>
                </View>

                {/* Distress Banner (Conditional) */}
                {isAlertActive && (
                    <Animated.View style={[styles.alertBanner, { opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }]}>
                        <MaterialCommunityIcons name="alert-decagram" size={28} color="#EF4444" />
                        <View style={styles.alertBannerTextWrap}>
                            <Text style={styles.alertBannerTitle}>Distress Pattern Detected</Text>
                            <Text style={styles.alertBannerDesc}>Abnormal audio or vitals picked up. SOS ready.</Text>
                        </View>
                    </Animated.View>
                )}

                {/* Activity Feed */}
                <View style={styles.feedSection}>
                    <Text style={styles.sectionTitle}>System Log</Text>
                    <View style={styles.feedContainer}>
                        {recentEvents.map((event, index) => (
                            <View key={event.id} style={styles.feedItem}>
                                <View style={styles.feedIconWrap}>
                                    <MaterialCommunityIcons 
                                        name={event.type === 'sync' ? 'sync' : event.type === 'audio' ? 'waveform' : 'bluetooth'} 
                                        size={16} 
                                        color="#A1A1AA" 
                                    />
                                </View>
                                <View style={styles.feedContent}>
                                    <View style={styles.feedHeader}>
                                        <Text style={styles.feedTitle}>{event.title}</Text>
                                        <Text style={styles.feedTime}>{event.time}</Text>
                                    </View>
                                    <Text style={styles.feedDetail}>{event.detail}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>

            {/* Sticky Action Footer */}
            <View style={styles.stickyFooter}>
                <Pressable
                    style={styles.actionButtonSecondary}
                    onPress={() => Alert.alert('Area scan', 'Use the home screen siren tile to start an area scan.')}
                >
                    <MaterialCommunityIcons name="radar" size={20} color="#FAFAFA" />
                </Pressable>
                
                <Pressable
                    style={[styles.actionButtonPrimary, !isPaired && styles.actionButtonPrimaryInactive]}
                    onPress={() => {
                        if (!isPaired) {
                            setIsPaired(true);
                            Alert.alert('Watch Connected', 'Live vitals sync has started.');
                        } else {
                            Alert.alert('Sync complete', 'All data is up to date.');
                        }
                    }}
                >
                    <MaterialCommunityIcons name={isPaired ? 'check-circle' : 'bluetooth-connect'} size={20} color="#FAFAFA" />
                    <Text style={styles.actionButtonPrimaryText}>{isPaired ? 'Synced' : 'Connect Watch'}</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#09090B',
    },
    content: {
        paddingTop: 40, // For notch safety
        paddingHorizontal: 20,
        paddingBottom: 100, // Space for sticky footer
        gap: 24,
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 12,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deviceIconBox: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deviceName: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '900',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusDotActive: {
        backgroundColor: '#10B981',
    },
    statusDotIdle: {
        backgroundColor: '#71717A',
    },
    statusText: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '600',
    },
    pairButtonSmall: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#EF4444',
    },
    pairButtonSmallText: {
        color: '#FAFAFA',
        fontSize: 12,
        fontWeight: '800',
    },
    dashboardSection: {
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        color: '#FAFAFA',
        fontSize: 18,
        fontWeight: '900',
    },
    vitalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    vitalCard: {
        width: (width - 40 - 12) / 2, // 2 columns
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        justifyContent: 'space-between',
        height: 110,
    },
    vitalCardPrimary: {
        width: '100%',
        height: 130,
        backgroundColor: '#18181B',
    },
    vitalTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    vitalIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vitalLabel: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '700',
    },
    vitalBottom: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    vitalValue: {
        color: '#FAFAFA',
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
    },
    vitalUnit: {
        color: '#71717A',
        fontSize: 14,
        fontWeight: '700',
    },
    scannerWidget: {
        backgroundColor: '#18181B',
        borderRadius: 32,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A',
        overflow: 'hidden',
    },
    scannerHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    scannerTitle: {
        color: '#FAFAFA',
        fontSize: 18,
        fontWeight: '900',
    },
    scannerSubtitle: {
        color: '#A1A1AA',
        fontSize: 13,
        marginTop: 2,
        fontWeight: '600',
    },
    scannerInteractive: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    scannerPulseRings: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.4)',
    },
    scannerButton: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#18181B',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 },
    },
    scannerButtonRecording: {
        backgroundColor: '#EF4444',
    },
    scannerButtonAnalyzing: {
        backgroundColor: '#F59E0B',
    },
    scannerStatusText: {
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 16,
    },
    progressBarBg: {
        width: '100%',
        height: 6,
        backgroundColor: '#27272A',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#EF4444',
    },
    alertBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: 20,
        padding: 16,
    },
    alertBannerTextWrap: {
        flex: 1,
    },
    alertBannerTitle: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '900',
    },
    alertBannerDesc: {
        color: '#FAFAFA',
        fontSize: 13,
        marginTop: 2,
        fontWeight: '600',
    },
    feedSection: {
        gap: 12,
    },
    feedContainer: {
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        gap: 16,
    },
    feedItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    feedIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedContent: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
        paddingBottom: 16,
    },
    feedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    feedTitle: {
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '800',
    },
    feedTime: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '600',
    },
    feedDetail: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '600',
    },
    stickyFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(9, 9, 11, 0.85)',
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionButtonSecondary: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonPrimary: {
        flex: 1,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#22C55E', // Green for connected/sync
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionButtonPrimaryInactive: {
        backgroundColor: '#EF4444', // Red to prompt pairing
    },
    actionButtonPrimaryText: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '800',
    },
});
