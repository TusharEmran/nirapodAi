import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Linking, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { fetchChatThread, sendChatMessage, type ChatMessage, type ChatThreadDetails } from '@/lib/auth-api';
import { useAuth } from '@/providers/auth-provider';

export default function ChatThreadScreen() {
    const scrollViewRef = useRef<ScrollView>(null);
    const router = useRouter();
    const { token } = useAuth();
    const params = useLocalSearchParams<{ id?: string; photoUri?: string; imageUrl?: string }>();
    const photoUri = typeof params.photoUri === 'string' ? params.photoUri : null;
    const imageUrl = typeof params.imageUrl === 'string' ? params.imageUrl : null;
    const [thread, setThread] = useState<ChatThreadDetails | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [photoInjected, setPhotoInjected] = useState(false);

    const messages = useMemo<ChatMessage[]>(() => thread?.messages || [], [thread]);
    const conversationName = thread?.name || 'Message';
    const conversationSubtitle = thread?.subtitle || 'Secure channel active';

    useEffect(() => {
        if (!token || !params.id || photoUri) {
            setLoading(false);
            return;
        }

        let mounted = true;

        const loadThread = async () => {
            try {
                const response = await fetchChatThread(token, params.id as string);
                if (mounted) {
                    setThread(response.thread);
                }
            } catch (error) {
                if (mounted) {
                    setErrorMessage(error instanceof Error ? error.message : 'Unable to load conversation.');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void loadThread();

        return () => {
            mounted = false;
        };
    }, [params.id, photoUri, token]);

    useEffect(() => {
        if (!token || !params.id || !imageUrl || photoInjected) {
            return;
        }

        let mounted = true;

        const postPhoto = async () => {
            try {
                const response = await sendChatMessage(token, params.id as string, {
                    imageUrl,
                    text: 'Snap sent from Sentinel AI.',
                });

                if (mounted) {
                    const postedMessageId = response.message?.id;

                    setThread({
                        ...response.thread,
                        messages: response.thread.messages.map((message) =>
                            postedMessageId && message.id === postedMessageId
                                ? { ...message, localImageUri: photoUri || undefined }
                                : message,
                        ),
                    });
                    setPhotoInjected(true);
                }
            } catch (error) {
                if (mounted) {
                    setErrorMessage(error instanceof Error ? error.message : 'Unable to save snap in this thread.');
                }
            }
        };

        void postPhoto();

        return () => {
            mounted = false;
        };
    }, [imageUrl, photoInjected, photoUri, params.id, token]);

    const handleSendMessage = async () => {
        if (!token || !params.id || !message.trim()) {
            return;
        }

        try {
            setSending(true);
            setErrorMessage('');

            const response = await sendChatMessage(token, params.id as string, {
                text: message.trim(),
            });

            setThread(response.thread);
            setMessage('');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to send the message right now.');
        } finally {
            setSending(false);
        }
    };

    return (
        <View style={styles.screen}>
            {/* Minimalist Dashboard Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#FAFAFA" />
                </Pressable>

                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>{conversationName}</Text>
                    <View style={styles.subtitleRow}>
                        <View style={styles.statusDot} />
                        <Text style={styles.headerSubtitle}>{conversationSubtitle}</Text>
                    </View>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="phone-outline" size={20} color="#FAFAFA" />
                </View>
            </View>

            <ScrollView 
                ref={scrollViewRef}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
                style={styles.thread} 
                contentContainerStyle={styles.threadContent} 
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.threadMeta}>
                    <Text style={styles.threadMetaText}>{loading ? 'Syncing...' : 'End-to-End Encrypted'}</Text>
                </View>

                {photoUri && !photoInjected ? (
                    <View style={[styles.messageBubble, styles.messageBubbleMine, styles.photoBubble]}>
                        <ChatPhoto uris={[photoUri]} />
                        <Text style={[styles.messageText, styles.messageTextMine]}>Evidence captured via Sentinel AI.</Text>
                        <Text style={[styles.messageTime, styles.messageTimeMine]}>Sending...</Text>
                    </View>
                ) : null}

                {messages.map((messageItem) => {
                    const hasImage = Boolean(getValidImageUris([messageItem.localImageUri, messageItem.imageUrl]).length);

                    return (
                        <View
                            key={messageItem.id}
                            style={[
                                styles.messageBubble,
                                messageItem.sender === 'me' ? styles.messageBubbleMine : styles.messageBubbleTheirs,
                                hasImage && styles.photoBubble,
                            ]}
                        >
                            {hasImage ? <ChatPhoto uris={[messageItem.localImageUri, messageItem.imageUrl]} /> : null}
                            
                            {messageItem.locationUrl ? (
                                <Pressable
                                    style={styles.locationChip}
                                    onPress={() => void Linking.openURL(messageItem.locationUrl || '')}
                                    accessibilityRole="link"
                                >
                                    <View style={styles.locationIconWrap}>
                                        <MaterialCommunityIcons name="map-marker-radius" size={14} color="#EF4444" />
                                    </View>
                                    <Text style={styles.locationChipText}>Live tracking active</Text>
                                </Pressable>
                            ) : null}
                            
                            {messageItem.text ? (
                                <Text style={[styles.messageText, messageItem.sender === 'me' && styles.messageTextMine]}>
                                    {messageItem.text}
                                </Text>
                            ) : null}
                            
                            <Text style={[styles.messageTime, messageItem.sender === 'me' && styles.messageTimeMine]}>
                                {messageItem.time}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Composer Section */}
            <View style={styles.composer}>
                <Pressable style={styles.mediaButton} onPress={() => router.push('/snap')} accessibilityRole="button">
                    <MaterialCommunityIcons name="camera-outline" size={22} color="#FAFAFA" />
                </Pressable>

                <Pressable style={styles.mediaButton} accessibilityRole="button">
                    <MaterialCommunityIcons name="microphone-outline" size={22} color="#FAFAFA" />
                </Pressable>

                <View style={styles.composerField}>
                    <TextInput
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Message..."
                        placeholderTextColor="#71717A"
                        style={styles.input}
                    />
                </View>

                <Pressable 
                    style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]} 
                    onPress={() => void handleSendMessage()} 
                    disabled={!message.trim() || sending}
                >
                    <MaterialCommunityIcons name="arrow-up" size={20} color="#09090B" />
                </Pressable>
            </View>

            {errorMessage ? (
                <View style={styles.errorBar}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FAFAFA" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
            ) : null}
        </View>
    );
}

function getValidImageUris(uris: (string | null | undefined)[]) {
    return uris.filter((uri): uri is string => {
        const trimmedUri = String(uri || '').trim();
        return Boolean(trimmedUri && trimmedUri !== 'undefined' && trimmedUri !== 'null');
    });
}

function ChatPhoto({ uris }: { uris: (string | null | undefined)[] }) {
    const imageUris = getValidImageUris(uris);
    const imageUriKey = imageUris.join('|');
    const [imageIndex, setImageIndex] = useState(0);

    useEffect(() => {
        setImageIndex(0);
    }, [imageUriKey]);

    if (!imageUris.length) {
        return null;
    }

    const imageUri = imageUris[Math.min(imageIndex, imageUris.length - 1)];

    return (
        <Image
            source={{ uri: imageUri }}
            style={styles.photoPreview}
            resizeMode="cover"
            onError={() => {
                setImageIndex((currentIndex) => Math.min(currentIndex + 1, imageUris.length - 1));
            }}
        />
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#09090B',
        paddingTop: 48, // Adjust for notch
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#18181B',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#27272A',
    },
    headerTitleWrap: {
        flex: 1,
    },
    headerTitle: {
        color: '#FAFAFA',
        fontSize: 18,
        fontWeight: '900',
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981', // Green indicator
    },
    headerSubtitle: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '600',
    },
    headerBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#27272A',
    },
    thread: {
        flex: 1,
    },
    threadContent: {
        gap: 16,
        padding: 20,
    },
    threadMeta: {
        alignItems: 'center',
        marginBottom: 8,
    },
    threadMetaText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    messageBubble: {
        maxWidth: '82%',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 4,
    },
    messageBubbleTheirs: {
        alignSelf: 'flex-start',
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderBottomLeftRadius: 4,
    },
    messageBubbleMine: {
        alignSelf: 'flex-end',
        backgroundColor: '#27272A',
        borderWidth: 1,
        borderColor: '#3F3F46',
        borderBottomRightRadius: 4,
    },
    messageText: {
        color: '#FAFAFA',
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 22,
    },
    messageTextMine: {
        color: '#FAFAFA',
    },
    messageTime: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '600',
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    messageTimeMine: {
        color: '#A1A1AA',
        alignSelf: 'flex-end',
    },
    photoBubble: {
        width: '82%',
        gap: 12,
        paddingHorizontal: 6,
        paddingVertical: 6,
    },
    photoPreview: {
        width: '100%',
        height: 240,
        borderRadius: 16,
        backgroundColor: '#09090B',
    },
    locationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        backgroundColor: '#09090B',
        paddingHorizontal: 10,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        marginTop: 4,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    locationIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationChipText: {
        color: '#FAFAFA',
        fontSize: 13,
        fontWeight: '700',
    },
    composer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#09090B',
        borderTopWidth: 1,
        borderTopColor: '#18181B',
    },
    mediaButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    composerField: {
        flex: 1,
        minHeight: 44,
        borderRadius: 22,
        backgroundColor: '#18181B',
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#27272A',
    },
    input: {
        color: '#FAFAFA',
        fontSize: 15,
        fontWeight: '500',
        paddingTop: 10,
        paddingBottom: 10,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.3,
    },
    errorBar: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        borderRadius: 16,
        backgroundColor: '#EF4444',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#EF4444',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    errorText: {
        flex: 1,
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '700',
    },
});
