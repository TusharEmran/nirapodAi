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
    const conversationSubtitle = thread?.subtitle || 'Conversation';

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
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#C84D61" />
                </Pressable>

                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>{conversationName}</Text>
                    <Text style={styles.headerSubtitle}>{conversationSubtitle}</Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="phone-outline" size={18} color="#C84D61" />
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
                    <Text style={styles.threadMetaText}>{loading ? 'Loading conversation...' : 'Today • Safe channel'}</Text>
                </View>

                {photoUri && !photoInjected ? (
                    <View style={[styles.messageBubble, styles.messageBubbleMine, styles.photoBubble]}>
                        <ChatPhoto uris={[photoUri]} />
                        <Text style={[styles.messageText, styles.messageTextMine]}>Snap sent from Sentinel AI.</Text>
                        <Text style={[styles.messageTime, styles.messageTimeMine]}>Just now</Text>
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
                                    <MaterialCommunityIcons name="map-marker-radius" size={16} color="#C84D61" />
                                    <Text style={styles.locationChipText}>Live location shared</Text>
                                </Pressable>
                            ) : null}
                            {messageItem.text ? <Text style={[styles.messageText, messageItem.sender === 'me' && styles.messageTextMine]}>{messageItem.text}</Text> : null}
                            <Text style={[styles.messageTime, messageItem.sender === 'me' && styles.messageTimeMine]}>{messageItem.time}</Text>
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.composer}>
                <View style={styles.composerField}>
                    <MaterialCommunityIcons name="message-text-outline" size={18} color="#A46A74" />
                    <TextInput
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Type a message"
                        placeholderTextColor="#A46A74"
                        style={styles.input}
                    />
                </View>

                <Pressable style={styles.mediaButton} accessibilityRole="button" accessibilityLabel="Attach photo" onPress={() => router.push('/snap')}>
                    <MaterialCommunityIcons name="image-outline" size={18} color="#C84D61" />
                </Pressable>

                <Pressable style={styles.mediaButton} accessibilityRole="button" accessibilityLabel="Send audio">
                    <MaterialCommunityIcons name="microphone-outline" size={18} color="#C84D61" />
                </Pressable>

                <Pressable style={[styles.sendButton, sending && styles.sendButtonDisabled]} accessibilityRole="button" onPress={() => void handleSendMessage()} disabled={sending}>
                    <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
                </Pressable>
            </View>

            {errorMessage ? (
                <View style={styles.errorBar}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#B84A5A" />
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
        width: '82%',
        gap: 10,
    },
    photoPreview: {
        width: '100%',
        height: 220,
        borderRadius: 18,
        backgroundColor: '#D38B97',
    },
    locationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        backgroundColor: '#FFF8F9',
        paddingHorizontal: 10,
        paddingVertical: 8,
        alignSelf: 'flex-start',
    },
    locationChipText: {
        color: '#C84D61',
        fontSize: 12,
        fontWeight: '800',
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
    sendButtonDisabled: {
        opacity: 0.7,
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
    errorBar: {
        marginTop: 10,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    errorText: {
        flex: 1,
        color: '#B84A5A',
        fontSize: 13,
        fontWeight: '700',
    },
});
