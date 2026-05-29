import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';

const profileStats = [
    { id: '1', label: 'Trusted contacts', value: '5' },
    { id: '2', label: 'Live alerts', value: '12' },
    { id: '3', label: 'Safety score', value: '92%' },
] as const;

const profileActions = [
    { id: '1', label: 'Emergency contacts', icon: 'account-multiple-outline', route: 'emergency-contacts' },
    { id: '2', label: 'Safety settings', icon: 'shield-cog-outline', route: 'safety-settings' },
] as const;

export default function ProfileScreen() {
    const router = useRouter();
    const { signOut, user } = useAuth();

    const handleSignOut = async () => {
        await signOut();
        router.replace('/(auth)/login');
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
                <View style={styles.avatarRing}>
                    {user?.profileImageUrl ? (
                        <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} contentFit="cover" />
                    ) : (
                        <View style={styles.avatarInner}>
                            <Text style={styles.avatarText}>HS</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.name}>{user?.fullName || 'Sentinel AI User'}</Text>
            </View>

            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <MaterialCommunityIcons name="account-circle-outline" size={20} color="#EF4444" />
                </View>

                <Pressable
                    onPress={() => router.push({ pathname: '/profile/[section]', params: { section: 'edit-profile' } })}
                    style={({ pressed }: { pressed: boolean }) => [styles.actionRow, pressed && styles.actionRowPressed]}
                    accessibilityRole="button"
                >
                    <View style={styles.actionIconWrap}>
                        <MaterialCommunityIcons name="account-edit-outline" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.actionLabel}>Edit profile</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#71717A" />
                </Pressable>

                {profileActions.map((action, index) => (
                    <Pressable
                        key={action.id}
                        onPress={() => router.push({ pathname: '/profile/[section]', params: { section: action.route } })}
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.actionRow,
                            index === profileActions.length - 1 && styles.actionRowLast,
                            pressed && styles.actionRowPressed,
                        ]}
                        accessibilityRole="button"
                    >
                        <View style={styles.actionIconWrap}>
                            <MaterialCommunityIcons name={action.icon as never} size={20} color="#EF4444" />
                        </View>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#71717A" />
                    </Pressable>
                ))}
            </View>

            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Emergency info</Text>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#EF4444" />
                </View>

                <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Primary contact</Text>
                    <Text style={styles.infoValue}>{user?.primaryContact || ''}</Text>
                </View>

                <View style={styles.infoBlock}>
                    <Text style={styles.infoLabel}>Medical note</Text>
                    <Text style={styles.infoValue}>{user?.medicalNote || ''}</Text>
                </View>
            </View>

            <Pressable style={styles.logoutButton} onPress={handleSignOut} accessibilityRole="button">
                <MaterialCommunityIcons name="logout-variant" size={18} color="#EF4444" />
                <Text style={styles.logoutText}>Sign out</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#09090B',
    },
    content: {
        flexGrow: 1,
        padding: 20,
        paddingTop: 45,
        gap: 16,
        paddingBottom: 28,
    },
    headerCard: {
        borderRadius: 30,
        backgroundColor: '#18181B',
        paddingVertical: 28,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    avatarRing: {
        width: 92,
        height: 92,
        borderRadius: 46,
        borderWidth: 6,
        borderColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 46,
    },
    avatarText: {
        color: '#FAFAFA',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    name: {
        color: '#FAFAFA',
        fontSize: 24,
        fontWeight: '900',
    },
    subtitle: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '700',
    },
    statRow: {
        width: '100%',
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: '#27272A',
        paddingVertical: 14,
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        color: '#EF4444',
        fontSize: 18,
        fontWeight: '900',
    },
    statLabel: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    sectionCard: {
        borderRadius: 26,
        backgroundColor: '#18181B',
        padding: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    sectionTitle: {
        color: '#FAFAFA',
        fontSize: 18,
        fontWeight: '900',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
    },
    actionRowPressed: {
        opacity: 0.6,
    },
    actionRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 2,
    },
    actionIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        flex: 1,
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '700',
    },
    infoBlock: {
        borderRadius: 18,
        backgroundColor: '#27272A',
        padding: 14,
        gap: 6,
    },
    infoLabel: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    infoValue: {
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
    },
    logoutButton: {
        marginTop: 4,
        minHeight: 54,
        borderRadius: 999,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '800',
    },
});
