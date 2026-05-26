import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { fetchContacts, type EmergencyContact } from '@/lib/auth-api';
import { useAuth } from '@/providers/auth-provider';

const quickActions = [
    { id: '1', label: 'Share location', icon: 'map-marker-radius-outline' },
] as const;

export default function CommunityScreen() {
    const router = useRouter();
    const { token } = useAuth();
    const [locationShared, setLocationShared] = useState(false);
    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
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
            } catch {
                if (mounted) {
                    setContacts([]);
                }
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

    const visibleContacts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const baseContacts = contacts.length > 0 ? [...contacts].sort((a, b) => {
            const timeA = new Date(a.updatedAt || 0).getTime();
            const timeB = new Date(b.updatedAt || 0).getTime();
            return timeB - timeA;
        }) : [];

        if (!query) {
            return baseContacts;
        }

        return baseContacts.filter((contact) => {
            const haystack = [contact.name, contact.phone, contact.relationship, contact.isAppUser ? 'app user' : 'not on app']
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [searchQuery, contacts]);

    const unreadCount = useMemo(
        () => contacts.filter((contact) => contact.isAppUser).length,
        [contacts],
    );

    const handleContactMessage = (contact: EmergencyContact) => {
        if (!contact.isAppUser) {
            Alert.alert('Not on the app', `${contact.name} is not a Her Shield user yet.`);
            return;
        }

        router.push(`/chat/${contact.id}`);
    };

    const handleShareLocation = () => {
        setLocationShared(true);
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.kicker}>Messages</Text>
                    <Text style={styles.title}>Stay connected</Text>
                </View>
                <View style={styles.headerIcon}>
                    <MaterialCommunityIcons name="message-text-outline" size={22} color="#C84D61" />
                </View>
            </View>

            <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={20} color="#A46A74" />
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search conversations"
                    placeholderTextColor="#A46A74"
                    style={styles.searchInput}
                />
            </View>

            <View style={styles.quickRow}>
                {quickActions.map((action) => (
                    <Pressable
                        key={action.id}
                        onPress={action.id === '1' ? handleShareLocation : undefined}
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.quickAction,
                            pressed && styles.quickActionPressed,
                            action.id === '1' && locationShared && styles.quickActionActive,
                        ]}
                    >
                        <View style={styles.quickIconWrap}>
                            <MaterialCommunityIcons name={action.icon as never} size={20} color="#C84D61" />
                        </View>
                        <Text style={styles.quickLabel}>{action.label}</Text>
                    </Pressable>
                ))}
            </View>

            {locationShared ? (
                <View style={styles.locationBanner}>
                    <MaterialCommunityIcons name="check-circle-outline" size={20} color="#C84D61" />
                    <Text style={styles.locationBannerText}>Live location sent to all contacts.</Text>
                </View>
            ) : null}

            <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>All contacts</Text>
                    <View style={styles.sectionMetaWrap}>
                        {unreadCount > 0 ? (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                            </View>
                        ) : null}
                        <Text style={styles.sectionMeta}>{loading ? 'Loading...' : `${visibleContacts.length} contacts`}</Text>
                    </View>
                </View>

                {visibleContacts.map((contact) => (
                    <Pressable
                        key={contact.id}
                        onPress={() => handleContactMessage(contact)}
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.chatRow,
                            pressed && styles.chatRowPressed,
                        ]}
                    >
                        <View style={[styles.avatar, { backgroundColor: contact.avatar }]}>
                            <Text style={styles.avatarText}>{contact.initials}</Text>
                        </View>

                        <View style={styles.chatBody}>
                            <View style={styles.chatTopLine}>
                                <Text style={styles.chatName}>{contact.name}</Text>
                                <Text style={styles.chatTime}>{contact.isAppUser ? 'App user' : 'Not on app'}</Text>
                            </View>
                            <Text style={styles.chatPreview} numberOfLines={1}>
                                {contact.relationship || contact.phone}
                            </Text>
                        </View>

                        <View style={[styles.contactStatePill, contact.isAppUser ? styles.contactStatePillActive : styles.contactStatePillMuted]}>
                            <Text style={styles.contactStatePillText}>{contact.isAppUser ? 'Message' : 'Unavailable'}</Text>
                        </View>
                    </Pressable>
                ))}

                {!loading && visibleContacts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="account-group-outline" size={22} color="#A46A74" />
                        <Text style={styles.emptyTitle}>{searchQuery.trim() ? 'No contacts found' : 'No saved contacts yet'}</Text>
                        <Text style={styles.emptyText}>{searchQuery.trim() ? 'Try a different name, phone, or relationship.' : 'Add contacts first so they appear here.'}</Text>
                    </View>
                ) : null}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#C84D61',
    },
    content: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 32,
        gap: 16,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 30,
        fontWeight: '900',
    },
    kicker: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 18,
        paddingHorizontal: 16,
        minHeight: 54,
    },
    searchInput: {
        flex: 1,
        color: '#1D1D1F',
        fontSize: 14,
        fontWeight: '600',
    },
    quickRow: {
        flexDirection: 'row',
        gap: 12,
    },
    quickAction: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 8,
    },
    quickActionPressed: {
        opacity: 0.82,
    },
    quickActionActive: {
        backgroundColor: 'rgba(255,255,255,0.28)',
    },
    quickIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLabel: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 16,
    },
    sectionCard: {
        width: '100%',
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: 18,
        gap: 14,
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
    sectionMeta: {
        color: '#A46A74',
        fontSize: 12,
        fontWeight: '700',
    },
    sectionMetaWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    locationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    locationBannerText: {
        flex: 1,
        color: '#1D1D1F',
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
    },
    chatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    chatRowPressed: {
        opacity: 0.85,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#C84D61',
        fontSize: 18,
        fontWeight: '900',
    },
    chatBody: {
        flex: 1,
        gap: 4,
    },
    chatTopLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chatName: {
        color: '#1D1D1F',
        fontSize: 15,
        fontWeight: '900',
    },
    chatTime: {
        color: '#A46A74',
        fontSize: 12,
        fontWeight: '700',
    },
    chatPreview: {
        color: '#7D6A70',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    contactStatePill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    contactStatePillActive: {
        backgroundColor: '#C84D61',
    },
    contactStatePillMuted: {
        backgroundColor: 'rgba(168, 106, 116, 0.14)',
    },
    contactStatePillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    unreadBadge: {
        minWidth: 26,
        height: 26,
        borderRadius: 13,
        paddingHorizontal: 8,
        backgroundColor: '#C84D61',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '900',
    },
    emptyState: {
        marginTop: 8,
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    emptyTitle: {
        color: '#1D1D1F',
        fontSize: 15,
        fontWeight: '900',
    },
    emptyText: {
        color: '#A46A74',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 18,
    },
});