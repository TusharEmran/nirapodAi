import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const conversations = [
    {
        id: '1',
        name: 'Mom',
        message: 'Are you safe? Call me back right away.',
        time: '2m',
        unread: true,
        accent: '#F1A7AF',
    },
    {
        id: '2',
        name: 'Emergency Contact',
        message: 'Live location shared. I am nearby.',
        time: '8m',
        unread: true,
        accent: '#FFFFFF',
    },
    {
        id: '3',
        name: 'Police Hotline',
        message: 'Officer assigned. Stay on the line.',
        time: '12m',
        unread: false,
        accent: '#FFD3D7',
    },
    {
        id: '4',
        name: 'Best Friend',
        message: 'I’m heading to your location now.',
        time: '22m',
        unread: false,
        accent: '#FFE9EA',
    },
] as const;

const quickActions = [
    { id: '1', label: 'Share location', icon: 'map-marker-radius-outline' },
    { id: '2', label: 'Call contact', icon: 'phone-outline' },
    { id: '3', label: 'Send SOS', icon: 'alert-octagon-outline' },
] as const;

export default function CommunityScreen() {
    const router = useRouter();
    const [locationShared, setLocationShared] = useState(false);

    const visibleConversations = conversations.map((conversation) =>
        locationShared
            ? {
                ...conversation,
                message: 'Live location sent to all contacts.',
                unread: false,
                accent: '#FFD3D7',
            }
            : conversation,
    );

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
                    <Text style={styles.sectionTitle}>Recent chats</Text>
                    <Text style={styles.sectionMeta}>{locationShared ? 'Location shared' : '4 conversations'}</Text>
                </View>

                {visibleConversations.map((conversation) => (
                    <Pressable
                        key={conversation.id}
                        onPress={() => router.push(`/chat/${conversation.id}`)}
                        style={({ pressed }: { pressed: boolean }) => [
                            styles.chatRow,
                            pressed && styles.chatRowPressed,
                        ]}
                    >
                        <View style={[styles.avatar, { backgroundColor: conversation.accent }]}>
                            <Text style={styles.avatarText}>{conversation.name.slice(0, 1)}</Text>
                        </View>

                        <View style={styles.chatBody}>
                            <View style={styles.chatTopLine}>
                                <Text style={styles.chatName}>{conversation.name}</Text>
                                <Text style={styles.chatTime}>{conversation.time}</Text>
                            </View>
                            <Text style={styles.chatPreview} numberOfLines={1}>
                                {conversation.message}
                            </Text>
                        </View>

                        {conversation.unread ? <View style={styles.unreadDot} /> : <View style={styles.readSpace} />}
                    </Pressable>
                ))}
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
    unreadDot: {
        width: 11,
        height: 11,
        borderRadius: 999,
        backgroundColor: '#C84D61',
    },
    readSpace: {
        width: 11,
        height: 11,
    },
});