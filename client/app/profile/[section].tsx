import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { fetchProfile, updateProfile, uploadMedia } from '@/lib/auth-api';
import { useAuth } from '@/providers/auth-provider';

type FieldConfig = {
    label: string;
    placeholder: string;
    value: string;
};

type SectionConfig = {
    title: string;
    subtitle: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    fields: FieldConfig[];
    helper: string;
};

const sectionConfig: Record<string, SectionConfig> = {
    'edit-profile': {
        title: 'Edit profile',
        subtitle: 'Update your personal details',
        icon: 'account-edit-outline',
        helper: 'These details help trusted contacts identify you quickly during an emergency.',
        fields: [
            { label: 'Full name', placeholder: 'Enter your full name', value: '' },
            { label: 'Phone number', placeholder: 'Enter your phone number', value: '' },
            { label: 'City', placeholder: 'Enter your city', value: '' },
            { label: 'Primary contact', placeholder: 'Add your primary contact', value: '' },
            { label: 'Secondary contact', placeholder: 'Add your secondary contact', value: '' },
            { label: 'Medical note', placeholder: 'Add a medical note', value: '' },
        ],
    },
    'emergency-contacts': {
        title: 'Emergency contacts',
        subtitle: 'Manage who receives your alerts',
        icon: 'account-multiple-outline',
        helper: 'These contacts will be notified when SOS is triggered or live location is shared.',
        fields: [
            { label: 'Primary contact', placeholder: 'Add primary contact', value: 'Mom' },
            { label: 'Secondary contact', placeholder: 'Add secondary contact', value: 'Best Friend' },
            { label: 'Medical note', placeholder: 'Add medical note', value: 'No known allergies' },
        ],
    },
    'safety-settings': {
        title: 'Safety settings',
        subtitle: 'Tweak emergency behavior',
        icon: 'shield-lock-outline',
        helper: 'Adjust how quickly SOS activates and how your location is shared.',
        fields: [
            { label: 'SOS delay', placeholder: 'Seconds before alert', value: '10 seconds' },
            { label: 'Live location', placeholder: 'Sharing preference', value: 'Enabled' },
            { label: 'Silent alert mode', placeholder: 'Alert preference', value: 'On' },
        ],
    },
    'privacy-controls': {
        title: 'Privacy controls',
        subtitle: 'Control visibility and sharing',
        icon: 'lock-outline',
        helper: 'Keep your account secure and decide how much information is visible.',
        fields: [
            { label: 'Profile visibility', placeholder: 'Who can see your profile', value: 'Trusted contacts only' },
            { label: 'Location history', placeholder: 'Location history setting', value: 'Save for 24 hours' },
            { label: 'Data sharing', placeholder: 'Data sharing setting', value: 'Minimal' },
        ],
    },
};

export default function ProfileSectionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ section?: string }>();
    const slug = params.section ?? 'edit-profile';

    if (slug === 'edit-profile') {
        return <BackendEditProfileScreen router={router} />;
    }

    return <LocalSectionScreen router={router} slug={slug} />;
}

function BackendEditProfileScreen({ router }: { router: ReturnType<typeof useRouter> }) {
    const { token, refreshSession } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [fieldValues, setFieldValues] = useState({
        fullName: '',
        phone: '',
        city: '',
        primaryContact: '',
        secondaryContact: '',
        medicalNote: '',
        emergencyLineNumber: '',
        profileImageUrl: '',
    });
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        let mounted = true;

        const loadProfile = async () => {
            if (!token) {
                setErrorMessage('Sign in again to edit your profile.');
                setLoading(false);
                return;
            }

            try {
                const response = await fetchProfile(token);
                if (!mounted) {
                    return;
                }

                setFieldValues({
                    fullName: response.user.fullName || '',
                    phone: response.user.phone || '',
                    city: response.user.city || '',
                    primaryContact: response.user.primaryContact || '',
                    secondaryContact: response.user.secondaryContact || '',
                    medicalNote: response.user.medicalNote || '',
                    emergencyLineNumber: response.user.emergencyLineNumber || '',
                    profileImageUrl: response.user.profileImageUrl || '',
                });
            } catch (error) {
                if (mounted) {
                    setErrorMessage(error instanceof Error ? error.message : 'Unable to load profile.');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void loadProfile();

        return () => {
            mounted = false;
        };
    }, [token]);

    const updateField = (key: keyof typeof fieldValues, value: string) => {
        setFieldValues((currentValues) => ({
            ...currentValues,
            [key]: value,
        }));
    };

    const pickProfileImage = async () => {
        if (!token) {
            setErrorMessage('Sign in again to upload a profile photo.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });

        if (result.canceled || !result.assets[0]?.uri) {
            return;
        }

        try {
            setUploadingImage(true);
            setErrorMessage('');

            const uploaded = await uploadMedia(token, result.assets[0].uri, 'nirapodai/profile');

            setFieldValues((currentValues) => ({
                ...currentValues,
                profileImageUrl: uploaded.url,
            }));
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to upload profile photo right now.');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        if (!token) {
            setErrorMessage('Sign in again to save profile changes.');
            return;
        }

        try {
            setSaving(true);
            setErrorMessage('');

            await updateProfile(token, fieldValues);
            await refreshSession();
            Alert.alert('Profile updated', 'Your profile has been saved successfully.');
            router.back();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to save changes right now.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#C84D61" />
                </Pressable>

                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>Edit profile</Text>
                    <Text style={styles.headerSubtitle}>Update your personal details</Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="account-edit-outline" size={20} color="#C84D61" />
                </View>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <View style={styles.heroAvatarWrap}>
                        {fieldValues.profileImageUrl ? (
                            <Image source={{ uri: fieldValues.profileImageUrl }} style={styles.heroAvatarImage} contentFit="cover" />
                        ) : (
                            <View style={styles.heroIconWrap}>
                                <MaterialCommunityIcons name="account-edit-outline" size={28} color="#FFFFFF" />
                            </View>
                        )}
                    </View>
                    <Text style={styles.heroTitle}>Edit profile</Text>
                    <Text style={styles.heroText}>
                        These details are stored in MongoDB and used across the profile tab and emergency flow.
                    </Text>

                    <Pressable style={styles.photoButton} onPress={() => void pickProfileImage()} accessibilityRole="button" disabled={uploadingImage}>
                        <MaterialCommunityIcons name="image-edit-outline" size={18} color="#C84D61" />
                        <Text style={styles.photoButtonText}>{uploadingImage ? 'Uploading...' : fieldValues.profileImageUrl ? 'Change profile photo' : 'Upload profile photo'}</Text>
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.formCard}>
                        <Text style={styles.loadingText}>Loading your profile...</Text>
                    </View>
                ) : (
                    <View style={styles.formCard}>
                        <ProfileInput label="Full name" value={fieldValues.fullName} onChangeText={(value) => updateField('fullName', value)} placeholder="Enter your full name" />
                        <ProfileInput label="Phone number" value={fieldValues.phone} onChangeText={(value) => updateField('phone', value)} placeholder="Enter your phone number" keyboardType="phone-pad" />
                        <ProfileInput label="City" value={fieldValues.city} onChangeText={(value) => updateField('city', value)} placeholder="Enter your city" />
                        <ProfileInput label="Primary contact" value={fieldValues.primaryContact} onChangeText={(value) => updateField('primaryContact', value)} placeholder="Primary contact name or number" />
                        <ProfileInput label="Secondary contact" value={fieldValues.secondaryContact} onChangeText={(value) => updateField('secondaryContact', value)} placeholder="Secondary contact name or number" />
                        <ProfileInput label="Medical note" value={fieldValues.medicalNote} onChangeText={(value) => updateField('medicalNote', value)} placeholder="Medical note" multiline />
                        <ProfileInput label="Emergency line number" value={fieldValues.emergencyLineNumber} onChangeText={(value) => updateField('emergencyLineNumber', value)} placeholder="Enter the fake call number" keyboardType="phone-pad" />
                    </View>
                )}

                {errorMessage ? (
                    <View style={styles.tipCard}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#C84D61" />
                        <Text style={styles.tipText}>{errorMessage}</Text>
                    </View>
                ) : null}
            </ScrollView>

            <View style={styles.footer}>
                <Pressable style={styles.secondaryButton} onPress={() => router.back()} accessibilityRole="button">
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={handleSave} accessibilityRole="button" disabled={saving || loading}>
                    <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
                </Pressable>
            </View>
        </View>
    );
}

function LocalSectionScreen({ router, slug }: { router: ReturnType<typeof useRouter>; slug: string }) {
    const config = sectionConfig[slug] ?? sectionConfig['edit-profile'];
    const [fieldValues, setFieldValues] = useState(() =>
        config.fields.reduce<Record<string, string>>((accumulator, field) => {
            accumulator[field.label] = field.value;
            return accumulator;
        }, {}),
    );

    const fieldList = useMemo(() => config.fields, [config.fields]);

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#C84D61" />
                </Pressable>

                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>{config.title}</Text>
                    <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name={config.icon} size={20} color="#C84D61" />
                </View>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <View style={styles.heroIconWrap}>
                        <MaterialCommunityIcons name={config.icon} size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.heroTitle}>{config.title}</Text>
                    <Text style={styles.heroText}>{config.helper}</Text>
                </View>

                <View style={styles.formCard}>
                    {fieldList.map((field, index) => (
                        <View key={field.label} style={[styles.fieldBlock, index === fieldList.length - 1 && styles.fieldBlockLast]}>
                            <Text style={styles.fieldLabel}>{field.label}</Text>
                            <TextInput
                                value={fieldValues[field.label]}
                                onChangeText={(nextValue) =>
                                    setFieldValues((currentValues) => ({
                                        ...currentValues,
                                        [field.label]: nextValue,
                                    }))
                                }
                                placeholder={field.placeholder}
                                placeholderTextColor="#A46A74"
                                style={styles.input}
                            />
                        </View>
                    ))}
                </View>

                <View style={styles.tipCard}>
                    <MaterialCommunityIcons name="information-outline" size={18} color="#C84D61" />
                    <Text style={styles.tipText}>This section is still local UI only. The Edit profile option is now backed by MongoDB.</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Pressable style={styles.secondaryButton} onPress={() => router.back()} accessibilityRole="button">
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.primaryButton} accessibilityRole="button">
                    <Text style={styles.primaryButtonText}>Save changes</Text>
                </Pressable>
            </View>
        </View>
    );
}

function ProfileInput({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    multiline,
}: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'phone-pad';
    multiline?: boolean;
}) {
    return (
        <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#A46A74"
                style={[styles.input, multiline && styles.textArea]}
                keyboardType={keyboardType}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
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
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 22,
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
    body: {
        flex: 1,
    },
    bodyContent: {
        gap: 14,
        paddingBottom: 20,
    },
    heroCard: {
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.96)',
        padding: 20,
        alignItems: 'center',
        gap: 10,
    },
    heroAvatarWrap: {
        width: 92,
        height: 92,
        borderRadius: 46,
        borderWidth: 4,
        borderColor: 'rgba(200,77,97,0.12)',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8EEF0',
    },
    heroIconWrap: {
        width: '100%',
        height: '100%',
        borderRadius: 46,
        backgroundColor: '#C84D61',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroAvatarImage: {
        width: '100%',
        height: '100%',
    },
    heroTitle: {
        color: '#1D1D1F',
        fontSize: 20,
        fontWeight: '900',
    },
    heroText: {
        color: '#7D6A70',
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '600',
    },
    photoButton: {
        minHeight: 44,
        borderRadius: 999,
        paddingHorizontal: 16,
        backgroundColor: '#F8EEF0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    photoButtonText: {
        color: '#C84D61',
        fontSize: 13,
        fontWeight: '800',
    },
    formCard: {
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.96)',
        padding: 18,
        gap: 12,
    },
    fieldBlock: {
        gap: 8,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(200,77,97,0.08)',
    },
    fieldBlockLast: {
        paddingBottom: 0,
        borderBottomWidth: 0,
    },
    fieldLabel: {
        color: '#8F6A73',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    input: {
        minHeight: 48,
        borderRadius: 16,
        backgroundColor: '#F8EEF0',
        paddingHorizontal: 14,
        color: '#1D1D1F',
        fontSize: 14,
        fontWeight: '700',
    },
    textArea: {
        minHeight: 92,
        paddingTop: 12,
    },
    tipCard: {
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.92)',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    tipText: {
        flex: 1,
        color: '#7D6A70',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    loadingText: {
        color: '#7D6A70',
        fontSize: 14,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 6,
    },
    secondaryButton: {
        flex: 1,
        minHeight: 54,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
    },
    secondaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    primaryButton: {
        flex: 1,
        minHeight: 54,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#C84D61',
        fontSize: 15,
        fontWeight: '800',
    },
});
