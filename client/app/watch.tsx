import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const liveMetrics = [
    {
        id: 'heart-rate',
        label: 'Heart rate',
        value: '84',
        unit: 'bpm',
        icon: 'heart-pulse',
        tone: '#C84D61',
    },
    {
        id: 'blood-pressure',
        label: 'Blood pressure',
        value: '118/76',
        unit: 'mmHg',
        icon: 'blood-bag',
        tone: '#B85A6B',
    },
    {
        id: 'stress',
        label: 'Stress level',
        value: 'Low',
        unit: 'stable',
        icon: 'shield-check',
        tone: '#6E8B73',
    },
] as const;

const detectionRules = [
    'Sudden heart-rate spikes above your baseline',
    'Elevated blood pressure with motion-free periods',
    'Repeated stress peaks over a short interval',
    'Manual trigger from the watch button',
] as const;

const recentEvents = [
    { id: '1', title: 'Baseline synced', detail: 'Watch connected 2 minutes ago', time: 'Now' },
    { id: '2', title: 'Reading reviewed', detail: 'Vitals stayed in the safe range', time: '14:20' },
    { id: '3', title: 'Area scan ready', detail: 'Siren mode can be triggered from home', time: '14:18' },
] as const;

export default function WatchScreen() {
    const [isPaired, setIsPaired] = useState(false);
    const [isAlertActive, setIsAlertActive] = useState(false);

    const nextActionLabel = useMemo(() => (isPaired ? 'Sync watch data' : 'Connect watch'), [isPaired]);
    const monitoringStatus = isAlertActive ? 'Suspicious pattern detected' : 'Monitoring normal range';

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
                <View style={styles.heroCopy}>
                    <Text style={styles.kicker}>Smart watch center</Text>
                    <Text style={styles.title}>Live vitals for suspicious activity detection</Text>
                    <Text style={styles.subtitle}>
                        Pair your wearable to monitor heart rate and blood pressure, then flag anything that looks abnormal.
                    </Text>
                </View>

                <View style={styles.deviceCard}>
                    <View style={styles.deviceIconWrap}>
                        <MaterialCommunityIcons name="watch-variant" size={28} color="#C84D61" />
                    </View>
                    <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>Her Shield Watch</Text>
                        <Text style={styles.deviceStatus}>{isPaired ? 'Connected and syncing live data' : 'Not paired yet'}</Text>
                    </View>
                    <View style={[styles.statusPill, isPaired ? styles.statusPillActive : styles.statusPillIdle]}>
                        <Text style={styles.statusPillText}>{isPaired ? 'Paired' : 'Offline'}</Text>
                    </View>
                </View>

                <Pressable
                    style={styles.primaryButton}
                    onPress={() => {
                        setIsPaired(true);
                        Alert.alert('Watch connected', 'Your smart watch is ready to calculate BP and heart rate for detection.');
                    }}
                    accessibilityRole="button">
                    <MaterialCommunityIcons name="bluetooth-connect" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{nextActionLabel}</Text>
                </Pressable>
                <View style={styles.heroButtonRow}>
                    <Pressable
                        style={styles.secondaryHeroButton}
                        onPress={() => {
                            setIsAlertActive((currentValue) => {
                                const nextValue = !currentValue;
                                Alert.alert(
                                    nextValue ? 'Suspicious reading detected' : 'Vitals back to normal',
                                    nextValue
                                        ? 'The watch has flagged a sudden change in heart rate and blood pressure.'
                                        : 'The live readings are back in the safe range.',
                                );
                                return nextValue;
                            });
                        }}
                        accessibilityRole="button">
                        <MaterialCommunityIcons name={isAlertActive ? 'shield-alert' : 'alert-circle-outline'} size={18} color="#C84D61" />
                        <Text style={styles.secondaryHeroButtonText}>{isAlertActive ? 'Clear alert' : 'Simulate suspicious reading'}</Text>
                    </Pressable>
                </View>
            </View>

            <View style={[styles.alertBanner, isAlertActive && styles.alertBannerActive]}>
                <View style={styles.alertIconWrap}>
                    <MaterialCommunityIcons name={isAlertActive ? 'shield-alert' : 'shield-check'} size={20} color="#FFFFFF" />
                </View>

                <View style={styles.alertCopy}>
                    <Text style={styles.alertTitle}>{monitoringStatus}</Text>
                    <Text style={styles.alertText}>
                        {isAlertActive
                            ? 'High heart rate and blood pressure readings can be pushed to your emergency flow.'
                            : 'The watch is watching for unusual heart rate or blood pressure changes.'}
                    </Text>
                </View>
            </View>

            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Live metrics</Text>
                    <MaterialCommunityIcons name="pulse" size={20} color="#C84D61" />
                </View>

                <View style={styles.metricGrid}>
                    {liveMetrics.map((metric) => (
                        <View key={metric.id} style={styles.metricCard}>
                            <View style={[styles.metricIconWrap, { backgroundColor: `${metric.tone}14` }]}>
                                <MaterialCommunityIcons name={metric.icon as never} size={20} color={metric.tone} />
                            </View>
                            <Text style={styles.metricLabel}>{metric.label}</Text>
                            <Text style={styles.metricValue}>{metric.value}</Text>
                            <Text style={styles.metricUnit}>{metric.unit}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Detection rules</Text>
                    <MaterialCommunityIcons name="radar" size={20} color="#C84D61" />
                </View>

                <Text style={styles.sectionCopy}>
                    The watch helps compare incoming readings against your normal range and raises a warning when something looks suspicious.
                </Text>

                <View style={styles.ruleList}>
                    {detectionRules.map((rule) => (
                        <View key={rule} style={styles.ruleRow}>
                            <View style={styles.ruleBullet} />
                            <Text style={styles.ruleText}>{rule}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent activity</Text>
                    <MaterialCommunityIcons name="timeline-clock-outline" size={20} color="#C84D61" />
                </View>

                <View style={styles.timeline}>
                    {recentEvents.map((event, index) => (
                        <View key={event.id} style={styles.timelineRow}>
                            <View style={styles.timelineRail}>
                                <View style={styles.timelineDot} />
                                {index !== recentEvents.length - 1 ? <View style={styles.timelineLine} /> : null}
                            </View>
                            <View style={styles.timelineContent}>
                                <View style={styles.timelineHeader}>
                                    <Text style={styles.timelineTitle}>{event.title}</Text>
                                    <Text style={styles.timelineTime}>{event.time}</Text>
                                </View>
                                <Text style={styles.timelineDetail}>{event.detail}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                    if (isAlertActive) {
                        Alert.alert('Emergency flow', 'A suspicious reading is active. Use the home screen siren tile if you want to scan your area now.');
                        return;
                    }

                    Alert.alert('Area scan', 'Use the home screen siren tile to start an area scan.');
                }}
                accessibilityRole="button">
                <MaterialCommunityIcons name="alarm-light" size={18} color="#C84D61" />
                <Text style={styles.secondaryButtonText}>Open area scan</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#C84D61',
    },
    content: {
        padding: 16,
        paddingTop: 18,
        paddingBottom: 20,
        gap: 10,
    },
    headerCard: {
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.98)',
        padding: 14,
        gap: 12,
        shadowColor: '#7A2434',
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#F7EDEF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBadge: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#C84D61',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroCopy: {
        gap: 6,
    },
    kicker: {
        color: '#B85A6B',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    title: {
        color: '#1D1D1F',
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '900',
        letterSpacing: -0.6,
    },
    subtitle: {
        color: '#8F8A8D',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    deviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 22,
        backgroundColor: '#FFF7F8',
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(200,77,97,0.08)',
    },
    deviceIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deviceInfo: {
        flex: 1,
        gap: 2,
    },
    deviceName: {
        color: '#1D1D1F',
        fontSize: 16,
        fontWeight: '900',
    },
    deviceStatus: {
        color: '#8F8A8D',
        fontSize: 13,
        fontWeight: '600',
    },
    statusPill: {
        minWidth: 72,
        minHeight: 30,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    statusPillActive: {
        backgroundColor: 'rgba(110,139,115,0.12)',
    },
    statusPillIdle: {
        backgroundColor: 'rgba(200,77,97,0.12)',
    },
    statusPillText: {
        color: '#C84D61',
        fontSize: 12,
        fontWeight: '800',
    },
    primaryButton: {
        minHeight: 48,
        borderRadius: 999,
        backgroundColor: '#C84D61',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    heroButtonRow: {
        flexDirection: 'row',
        gap: 10,
    },
    secondaryHeroButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 999,
        backgroundColor: '#FFF7F8',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(200,77,97,0.12)',
    },
    secondaryHeroButtonText: {
        color: '#C84D61',
        fontSize: 14,
        fontWeight: '800',
    },
    alertBanner: {
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(200,77,97,0.08)',
    },
    alertBannerActive: {
        backgroundColor: '#FFF1F3',
        borderColor: 'rgba(200,77,97,0.22)',
    },
    alertIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#C84D61',
    },
    alertCopy: {
        flex: 1,
        gap: 2,
    },
    alertTitle: {
        color: '#1D1D1F',
        fontSize: 15,
        fontWeight: '900',
    },
    alertText: {
        color: '#8F8A8D',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    sectionCard: {
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.98)',
        padding: 14,
        gap: 12,
        shadowColor: '#7A2434',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        color: '#1D1D1F',
        fontSize: 18,
        fontWeight: '900',
    },
    metricGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    metricCard: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: '#FFF8F9',
        padding: 11,
        gap: 4,
        alignItems: 'center',
    },
    metricIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    metricLabel: {
        color: '#7D6A70',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    metricValue: {
        color: '#1D1D1F',
        fontSize: 18,
        fontWeight: '900',
    },
    metricUnit: {
        color: '#B85A6B',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    sectionCopy: {
        color: '#8F8A8D',
        fontSize: 14,
        lineHeight: 21,
        fontWeight: '600',
    },
    ruleList: {
        gap: 12,
    },
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    ruleBullet: {
        width: 8,
        height: 8,
        borderRadius: 999,
        marginTop: 6,
        backgroundColor: '#C84D61',
    },
    ruleText: {
        flex: 1,
        color: '#1D1D1F',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    timeline: {
        gap: 14,
    },
    timelineRow: {
        flexDirection: 'row',
        gap: 12,
    },
    timelineRail: {
        width: 18,
        alignItems: 'center',
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 999,
        backgroundColor: '#C84D61',
        marginTop: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        minHeight: 28,
        backgroundColor: 'rgba(200,77,97,0.2)',
        marginTop: 4,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: 2,
    },
    timelineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    timelineTitle: {
        flex: 1,
        color: '#1D1D1F',
        fontSize: 14,
        fontWeight: '800',
    },
    timelineTime: {
        color: '#B85A6B',
        fontSize: 12,
        fontWeight: '700',
    },
    timelineDetail: {
        marginTop: 3,
        color: '#8F8A8D',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    secondaryButton: {
        minHeight: 54,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.96)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 2,
    },
    secondaryButtonText: {
        color: '#C84D61',
        fontSize: 15,
        fontWeight: '800',
    },
});
