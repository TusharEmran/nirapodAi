import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';

const threadMessages = [
    {
        id: '1',
        sender: 'them',
        text: 'Are you okay? I saw your live location update.',
        time: '8:12 PM',
    },
    {
        id: '2',
        sender: 'me',
        text: 'I opened the emergency screen and shared my location.',
        time: '8:13 PM',
    },
    {
        id: '3',
        sender: 'them',
        text: 'Stay where you are. I am heading there now.',
        time: '8:13 PM',
    },
] as const;

const contacts: Record<string, { name: string; subtitle: string }> = {
    '1': { name: 'Mom', subtitle: 'Trusted contact' },
    '2': { name: 'Emergency Contact', subtitle: 'Live location on' },
    '3': { name: 'Police Hotline', subtitle: 'Assigned officer' },
    '4': { name: 'Best Friend', subtitle: 'On the way' },
};

export default function ChatThreadScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string; photoUri?: string }>();
    const conversation = params.id ? contacts[params.id] ?? { name: 'Message', subtitle: 'Conversation' } : { name: 'Message', subtitle: 'Conversation' };
    const photoUri = typeof params.photoUri === 'string' ? params.photoUri : null;

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#C84D61" />
                </Pressable>

                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>{conversation.name}</Text>
                    <Text style={styles.headerSubtitle}>{conversation.subtitle}</Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="phone-outline" size={18} color="#C84D61" />
                </View>
            </View>

            <ScrollView style={styles.thread} contentContainerStyle={styles.threadContent} showsVerticalScrollIndicator={false}>
                <View style={styles.threadMeta}>
                    <Text style={styles.threadMetaText}>Today • Safe channel</Text>
                </View>

                {photoUri ? (
                    <View style={[styles.messageBubble, styles.messageBubbleMine, styles.photoBubble]}>
                        <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
                        <Text style={[styles.messageText, styles.messageTextMine]}>Snap sent from Her Shield.</Text>
                        <Text style={[styles.messageTime, styles.messageTimeMine]}>Just now</Text>
                    </View>
                ) : null}

                {threadMessages.map((message) => (
                    <View
                        key={message.id}
                        style={[
                            styles.messageBubble,
                            message.sender === 'me' ? styles.messageBubbleMine : styles.messageBubbleTheirs,
                        ]}
                    >
                        <Text style={[styles.messageText, message.sender === 'me' && styles.messageTextMine]}>
                            {message.text}
                        </Text>
                        <Text style={[styles.messageTime, message.sender === 'me' && styles.messageTimeMine]}>
                            {message.time}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.composer}>
                <View style={styles.composerField}>
                    <MaterialCommunityIcons name="message-text-outline" size={18} color="#A46A74" />
                    <TextInput placeholder="Type a message" placeholderTextColor="#A46A74" style={styles.input} />
                </View>

                <Pressable style={styles.mediaButton} accessibilityRole="button" accessibilityLabel="Attach photo">
                    <MaterialCommunityIcons name="image-outline" size={18} color="#C84D61" />
                </Pressable>

                <Pressable style={styles.mediaButton} accessibilityRole="button" accessibilityLabel="Send audio">
                    <MaterialCommunityIcons name="microphone-outline" size={18} color="#C84D61" />
                </Pressable>

                <Pressable style={styles.sendButton} accessibilityRole="button">
                    <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#C84D61',
        paddingTop: 42,
        paddingHorizontal: 18,
        paddingBottom: 18,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 18,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleWrap: {
        flex: 1,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
    },
    headerBadge: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thread: {
        flex: 1,
        backgroundColor: '#C84D61',
    },
    threadContent: {
        gap: 12,
        paddingBottom: 18,
        backgroundColor: '#C84D61',
    },
    threadMeta: {
        alignItems: 'center',
        marginBottom: 4,
    },
    threadMetaText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '700',
    },
    messageBubble: {
        maxWidth: '82%',
        borderRadius: 24,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
    },
    messageBubbleTheirs: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.94)',
    },
    messageBubbleMine: {
        alignSelf: 'flex-end',
        backgroundColor: '#F4D7DB',
    },
    messageText: {
        color: '#1D1D1F',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
    },
    messageTextMine: {
        color: '#7A2434',
    },
    messageTime: {
        color: '#A46A74',
        fontSize: 11,
        fontWeight: '700',
        alignSelf: 'flex-start',
    },
    messageTimeMine: {
        color: '#A46A74',
        alignSelf: 'flex-end',
    },
    photoBubble: {
        gap: 10,
    },
    photoPreview: {
        width: '100%',
        height: 220,
        borderRadius: 18,
        backgroundColor: '#D38B97',
    },
    composer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        backgroundColor: '#C84D61',
    },
    composerField: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 54,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 14,
    },
    input: {
        flex: 1,
        color: '#1D1D1F',
        fontSize: 14,
        fontWeight: '600',
    },
    sendButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#B85A6B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(184,90,107,0.18)',
    },
});
