import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

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
    const [countdown, setCountdown] = useState(9);
    const infoRowAnimations = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    useEffect(() => {
        if (countdown <= 1) {
            return;
        }

        const timer = setInterval(() => {
            setCountdown((currentValue) => {
                if (currentValue <= 1) {
                    clearInterval(timer);
                    return 1;
                }

                return currentValue - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown]);

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
            <View style={styles.topBar}>
                <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
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
                        <MaterialCommunityIcons name="map-marker" size={28} color="#FFFFFF" />
                    </View>
                    <View style={[styles.orbitIcon, { top: RING + 90 - 10, left: RING + 70 - 10 }]}>
                        <MaterialCommunityIcons name="chat" size={20} color="#FFFFFF" />
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
                        <MaterialCommunityIcons name="check" size={15} color="#C84D61" />
                    </View>
                    <Text style={styles.infoText}>
                        Your contacts have been informed you are in danger
                    </Text>
                </Animated.View>

                <Animated.View style={[styles.infoRow, infoRowStyle(infoRowAnimations[1])]}>
                    <View style={styles.checkCircle}>
                        <MaterialCommunityIcons name="check" size={15} color="#C84D61" />
                    </View>
                    <Text style={styles.infoText}>You are sharing your live location</Text>
                </Animated.View>

                <Animated.View style={[styles.infoRow, infoRowStyle(infoRowAnimations[2])]}>
                    <View style={styles.checkCircle}>
                        <MaterialCommunityIcons name="check" size={15} color="#C84D61" />
                    </View>
                    <Text style={styles.infoText}>Authorities will contact you soon</Text>
                </Animated.View>
            </View>

            <Pressable style={styles.callButton} accessibilityRole="button">
                <Text style={styles.callButtonText}>Call 122</Text>
            </Pressable>

            <Pressable style={styles.cancelButton} accessibilityRole="button">
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#C84D61',
        paddingTop: 45,
        paddingHorizontal: 20,
        paddingBottom: 24,
        alignItems: 'center',
    },
    topBar: {
        width: '100%',
        minHeight: 50,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    circleSection: {
        width: '100%',
        alignItems: 'center',
        marginTop: 2,
    },
    contactRing: {
        width: 280,
        height: 280,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    contactOrbit: {
        position: 'absolute',
        width: 204,
        height: 204,
        borderRadius: 999,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.32)',
        borderStyle: 'dashed',
    },
    contactCenter: {
        width: 126,
        height: 126,
        borderRadius: 63,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countdown: {
        color: '#B85A6B',
        fontSize: 68,
        fontWeight: '700',
        lineHeight: 70,
    },
    orbitIcon: {
        position: 'absolute',
    },
    contactAvatar: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.78)',
    },
    infoList: {
        width: '100%',
        gap: 14,
        marginTop: 8,
        paddingHorizontal: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        lineHeight: 19,
    },
    callButton: {
        marginTop: 26,
        width: '100%',
        maxWidth: 210,
        minHeight: 52,
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    callButtonText: {
        color: '#B85A6B',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        marginTop: 12,
        width: '100%',
        maxWidth: 210,
        minHeight: 52,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
