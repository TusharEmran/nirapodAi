import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { fetchContacts, type EmergencyContact } from '@/lib/auth-api';
import { useAuth } from '@/providers/auth-provider';

export default function CommunityScreen() {
    const router = useRouter();
    const { token, user } = useAuth();
    const [locationShared, setLocationShared] = useState(false);
    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState<EmergencyContact[]>(user?.emergencyContacts || []);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        let mounted = true;

        const loadContacts = async () => {
            try {
                const response = await fetchContacts(token);
                if (mounted) {
                    setContacts(response.contacts);
                }
            } catch (error) {
                // Keep initial fallback
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void loadContacts();

        return () => {
            mounted = false;
        };
    }, [token]);

    useEffect(() => {
        if (user?.emergencyContacts) {
            setContacts(user.emergencyContacts);
        }
    }, [user?.emergencyContacts]);

    const { appUsers, visibleContacts } = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        
        const baseContacts = contacts.length > 0 ? [...contacts].sort((a, b) => {
            const timeA = new Date(a.updatedAt || 0).getTime();
            const timeB = new Date(b.updatedAt || 0).getTime();
            return timeB - timeA;
        }) : [];

        const filtered = query 
            ? baseContacts.filter((contact) => {
                const haystack = [contact.name, contact.phone, contact.relationship].join(' ').toLowerCase();
                return haystack.includes(query);
            })
            : baseContacts;

        return {
            appUsers: baseContacts.filter(c => c.isAppUser),
            visibleContacts: filtered,
        };
    }, [searchQuery, contacts]);

    const handleContactMessage = (contact: EmergencyContact) => {
        if (!contact.isAppUser) {
            Alert.alert('Not on the app', `${contact.name} is not a Sentinel AI user yet. Invite them to secure your communications.`);
            return;
        }

        router.push(`/chat/${contact.id}`);
    };

    const handleShareLocation = () => {
        setLocationShared(true);
        setTimeout(() => setLocationShared(false), 5000); // Reset after 5s for demo
    };

    return (
        <View style={styles.screen}>
            {/* Minimal Dashboard Header */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.kicker}>Secure Comms</Text>
                    <Text style={styles.title}>Messages</Text>
                </View>
                <Pressable style={styles.headerIcon} onPress={handleShareLocation}>
                    <MaterialCommunityIcons name={locationShared ? 'check' : 'map-marker-radius'} size={22} color={locationShared ? '#10B981' : '#FAFAFA'} />
                </Pressable>
            </View>

            {locationShared && (
                <View style={styles.locationBanner}>
                    <MaterialCommunityIcons name="broadcast" size={20} color="#10B981" />
                    <Text style={styles.locationBannerText}>Live location broadcasting to active contacts...</Text>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
                
                {/* Active Network (Horizontal Scroll) */}
                {appUsers.length > 0 && !searchQuery ? (
                    <View style={styles.activeNetworkSection}>
                        <Text style={styles.sectionTitleSmall}>Secure Network</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeNetworkScroll}>
                            {appUsers.map((user) => (
                                <Pressable key={user.id} style={styles.activeUserNode} onPress={() => handleContactMessage(user)}>
                                    <View style={[styles.activeAvatar, { backgroundColor: user.avatar }]}>
                                        <Text style={styles.activeAvatarText}>{user.initials}</Text>
                                        <View style={styles.onlineDot} />
                                    </View>
                                    <Text style={styles.activeUserName} numberOfLines={1}>{user.name.split(' ')[0]}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                ) : null}

                {/* Sticky Search Bar */}
                <View style={styles.searchWrapper}>
                    <View style={styles.searchBar}>
                        <MaterialCommunityIcons name="magnify" size={20} color="#71717A" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search contacts..."
                            placeholderTextColor="#71717A"
                            style={styles.searchInput}
                        />
                    </View>
                </View>

                {/* Contacts List */}
                <View style={styles.contactsList}>
                    {visibleContacts.map((contact) => (
                        <Pressable
                            key={contact.id}
                            onPress={() => handleContactMessage(contact)}
                            style={({ pressed }) => [
                                styles.chatRow,
                                pressed && styles.chatRowPressed,
                                !contact.isAppUser && styles.chatRowMuted
                            ]}
                        >
                            <View style={[styles.avatar, { backgroundColor: contact.avatar }]}>
                                <Text style={styles.avatarText}>{contact.initials}</Text>
                            </View>

                            <View style={styles.chatBody}>
                                <View style={styles.chatTopLine}>
                                    <Text style={[styles.chatName, !contact.isAppUser && styles.chatNameMuted]}>
                                        {contact.name}
                                    </Text>
                                    {contact.isAppUser ? (
                                        <MaterialCommunityIcons name="shield-lock" size={14} color="#10B981" />
                                    ) : (
                                        <Text style={styles.inviteText}>Invite</Text>
                                    )}
                                </View>
                                <Text style={styles.chatPreview} numberOfLines={1}>
                                    {contact.relationship || contact.phone}
                                </Text>
                            </View>
                        </Pressable>
                    ))}

                    {!loading && visibleContacts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="account-search-outline" size={32} color="#27272A" />
                            <Text style={styles.emptyTitle}>{searchQuery.trim() ? 'No contacts found' : 'No directory data'}</Text>
                            <Text style={styles.emptyText}>{searchQuery.trim() ? 'Try a different search query.' : 'Add emergency contacts first.'}</Text>
                        </View>
                    ) : null}
                </View>
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    title: {
        color: '#FAFAFA',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    kicker: {
        color: '#10B981', // Secure Green
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        marginHorizontal: 20,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
    },
    locationBannerText: {
        flex: 1,
        color: '#FAFAFA',
        fontSize: 13,
        fontWeight: '700',
    },
    content: {
        paddingBottom: 40,
    },
    activeNetworkSection: {
        paddingBottom: 20,
    },
    sectionTitleSmall: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    activeNetworkScroll: {
        paddingHorizontal: 16,
        gap: 16,
    },
    activeUserNode: {
        alignItems: 'center',
        width: 64,
        gap: 6,
    },
    activeAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#18181B', // Dark outline
    },
    activeAvatarText: {
        color: '#FAFAFA',
        fontSize: 20,
        fontWeight: '900',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10B981',
        borderWidth: 3,
        borderColor: '#09090B',
    },
    activeUserName: {
        color: '#FAFAFA',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    searchWrapper: {
        backgroundColor: '#09090B',
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 20,
        paddingHorizontal: 16,
        height: 52,
    },
    searchInput: {
        flex: 1,
        color: '#FAFAFA',
        fontSize: 15,
        fontWeight: '500',
    },
    contactsList: {
        paddingHorizontal: 20,
        gap: 12,
    },
    chatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#18181B',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    chatRowPressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.8,
    },
    chatRowMuted: {
        backgroundColor: '#09090B',
        borderColor: '#18181B',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FAFAFA',
        fontSize: 18,
        fontWeight: '900',
    },
    chatBody: {
        flex: 1,
        gap: 2,
    },
    chatTopLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chatName: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '800',
    },
    chatNameMuted: {
        color: '#A1A1AA',
    },
    inviteText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    chatPreview: {
        color: '#71717A',
        fontSize: 13,
        fontWeight: '500',
    },
    emptyState: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyTitle: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '800',
        marginTop: 8,
    },
    emptyText: {
        color: '#71717A',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
});