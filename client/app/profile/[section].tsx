import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { addContact, deleteContact, fetchContacts, fetchProfile, type EmergencyContact, type SafetySettings, updateContact, updateProfile, uploadMedia, uploadMediaFile } from '@/lib/auth-api';
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
};

const safetyCountdownOptions = [5, 10, 15] as const;
const sirenVolumeOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
] as const;
const watchSensitivityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
] as const;
const silentModeOptions = [
    { value: 'vibrate-only', label: 'Vibrate only' },
    { value: 'flash-screen', label: 'Flash screen' },
    { value: 'sound-alarm', label: 'Sound alarm' },
] as const;
const visibilityOptions = [
    { value: 'public', label: 'Public' },
    { value: 'contacts-only', label: 'Contacts only' },
    { value: 'private', label: 'Private' },
] as const;
const retentionOptions = [
    { value: 'off', label: 'Off' },
    { value: '24-hours', label: '24 hours' },
    { value: '7-days', label: '7 days' },
    { value: '30-days', label: '30 days' },
] as const;
const messageAccessOptions = [
    { value: 'anyone', label: 'Anyone' },
    { value: 'contacts', label: 'Contacts' },
    { value: 'app-users', label: 'App users' },
] as const;

export default function ProfileSectionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ section?: string }>();
    const slug = Array.isArray(params.section) ? params.section[0] ?? 'edit-profile' : params.section ?? 'edit-profile';

    if (slug === 'edit-profile') {
        return <BackendEditProfileScreen router={router} />;
    }

    if (slug === 'emergency-contacts') {
        return <BackendEmergencyContactsScreen router={router} />;
    }

    if (slug === 'safety-settings') {
        return <BackendSafetySettingsScreen router={router} />;
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

function BackendEmergencyContactsScreen({ router }: { router: ReturnType<typeof useRouter> }) {
    const { token, refreshSession } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [selectedContactId, setSelectedContactId] = useState('');
    const [formValues, setFormValues] = useState({
        name: '',
        phone: '',
        relationship: '',
    });

    useEffect(() => {
        let mounted = true;

        const loadContacts = async () => {
            if (!token) {
                setErrorMessage('Sign in again to manage your contacts.');
                setLoading(false);
                return;
            }

            try {
                const response = await fetchContacts(token);
                if (!mounted) {
                    return;
                }

                setContacts(response.contacts);
            } catch (error) {
                if (mounted) {
                    setErrorMessage(error instanceof Error ? error.message : 'Unable to load contacts.');
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

    const resetForm = () => {
        setMode('add');
        setSelectedContactId('');
        setFormValues({
            name: '',
            phone: '',
            relationship: '',
        });
    };

    const openAddForm = () => {
        setErrorMessage('');
        resetForm();
    };

    const openEditForm = (contact: EmergencyContact) => {
        setErrorMessage('');
        setMode('edit');
        setSelectedContactId(contact.id);
        setFormValues({
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship || '',
        });
    };

    const handleSubmit = async () => {
        if (!token) {
            setErrorMessage('Sign in again to manage your contacts.');
            return;
        }

        if (!formValues.name.trim() || !formValues.phone.trim()) {
            setErrorMessage('Enter a contact name and phone number.');
            return;
        }

        try {
            setSaving(true);
            setErrorMessage('');

            const payload = {
                name: formValues.name.trim(),
                phone: formValues.phone.trim(),
                relationship: formValues.relationship.trim(),
            };

            const response = mode === 'edit' && selectedContactId
                ? await updateContact(token, selectedContactId, payload)
                : await addContact(token, payload);

            setContacts(response.contacts);
            await refreshSession();
            resetForm();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to save this contact right now.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (contact: EmergencyContact) => {
        if (!token) {
            setErrorMessage('Sign in again to manage your contacts.');
            return;
        }

        Alert.alert(
            'Delete contact',
            `Remove ${contact.name} from your emergency contacts?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            setErrorMessage('');

                            const response = await deleteContact(token, contact.id);
                            setContacts(response.contacts);
                            await refreshSession();

                            if (selectedContactId === contact.id) {
                                resetForm();
                            }
                        } catch (error) {
                            setErrorMessage(error instanceof Error ? error.message : 'Unable to delete this contact right now.');
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ],
        );
    };

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#C84D61" />
                </Pressable>

                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>Emergency contacts</Text>
                    <Text style={styles.headerSubtitle}>Add, edit, or delete trusted contacts</Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="account-multiple-outline" size={20} color="#C84D61" />
                </View>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

                <View style={styles.formCard}>
                    <Text style={styles.sectionFormTitle}>{mode === 'edit' ? 'Edit contact' : 'Add contact'}</Text>
                    <Text style={styles.sectionFormHelper}>
                        {mode === 'edit' ? 'Update the contact details below, then save your changes.' : 'Fill in a contact and save it to your emergency list.'}
                    </Text>

                    <ProfileInput label="Name" value={formValues.name} onChangeText={(value) => setFormValues((current) => ({ ...current, name: value }))} placeholder="Contact name" />
                    <ProfileInput label="Phone number" value={formValues.phone} onChangeText={(value) => setFormValues((current) => ({ ...current, phone: value }))} placeholder="Contact phone number" keyboardType="phone-pad" />
                    <ProfileInput label="Relationship" value={formValues.relationship} onChangeText={(value) => setFormValues((current) => ({ ...current, relationship: value }))} placeholder="Mother, brother, friend..." />

                    <View style={styles.contactFormActions}>
                        {mode === 'edit' ? (
                            <Pressable style={styles.formGhostButton} onPress={resetForm} accessibilityRole="button" disabled={saving}>
                                <Text style={styles.formGhostButtonText}>Cancel edit</Text>
                            </Pressable>
                        ) : null}

                        <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={() => void handleSubmit()} accessibilityRole="button" disabled={saving || loading}>
                            <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add contact'}</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.formCard}>
                    <View style={styles.listHeaderRow}>
                        <Text style={styles.sectionFormTitle}>Saved contacts</Text>
                        {loading ? <Text style={styles.listMetaText}>Loading...</Text> : <Text style={styles.listMetaText}>{contacts.length} total</Text>}
                    </View>

                    {loading ? (
                        <View style={styles.tipCard}>
                            <MaterialCommunityIcons name="loading" size={18} color="#C84D61" />
                            <Text style={styles.tipText}>Loading contacts...</Text>
                        </View>
                    ) : null}

                    {contacts.length ? contacts.map((contact) => (
                        <View key={contact.id} style={styles.contactCard}>
                            <View style={[styles.contactAvatar, { backgroundColor: contact.avatar }]}>
                                <Text style={styles.contactAvatarText}>{contact.initials}</Text>
                            </View>

                            <View style={styles.contactDetails}>
                                <Text style={styles.contactName}>{contact.name}</Text>
                                <Text style={styles.contactPhone}>{contact.phone}</Text>
                                {contact.relationship ? <Text style={styles.contactRelationship}>{contact.relationship}</Text> : null}
                                {contact.isAppUser ? <Text style={styles.appUserBadge}>On the app</Text> : <Text style={styles.nonAppUserBadge}>Not on the app</Text>}
                            </View>

                            <View style={styles.contactActionStack}>
                                <Pressable style={styles.smallActionButton} onPress={() => openEditForm(contact)} accessibilityRole="button">
                                    <MaterialCommunityIcons name="pencil-outline" size={18} color="#C84D61" />
                                </Pressable>
                                <Pressable style={styles.smallActionButton} onPress={() => handleDelete(contact)} accessibilityRole="button">
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#C84D61" />
                                </Pressable>
                            </View>
                        </View>
                    )) : (
                        loading ? null : <Text style={styles.emptyText}>No emergency contacts yet. Add your first trusted contact above.</Text>
                    )}
                </View>

                {errorMessage ? (
                    <View style={styles.tipCard}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#C84D61" />
                        <Text style={styles.tipText}>{errorMessage}</Text>
                    </View>
                ) : null}
            </ScrollView>

            <View style={styles.footer}>
                <Pressable style={styles.secondaryButton} onPress={() => router.back()} accessibilityRole="button">
                    <Text style={styles.secondaryButtonText}>Done</Text>
                </Pressable>
            </View>
        </View>
    );
}

function BackendSafetySettingsScreen({ router }: { router: ReturnType<typeof useRouter> }) {
    const { token, refreshSession } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [formValues, setFormValues] = useState({
        sosCountdownSeconds: 10,
        fakeCallLineNumber: '',
        sirenPassword: '122',
        sirenVolume: 'high' as SafetySettings['sirenVolume'],
        sirenAutoStopSeconds: 60,
        watchSensitivity: 'medium' as SafetySettings['watchSensitivity'],
        silentEmergencyMode: 'sound-alarm' as SafetySettings['silentEmergencyMode'],
        fakeCallAudioUrl: '',
        fakeCallAudioName: '',
    });

    useEffect(() => {
        let mounted = true;

        const loadProfile = async () => {
            if (!token) {
                setErrorMessage('Sign in again to adjust safety settings.');
                setLoading(false);
                return;
            }

            try {
                const response = await fetchProfile(token);
                if (!mounted) {
                    return;
                }

                const settings = response.user.safetySettings;

                setFormValues({
                    sosCountdownSeconds: settings?.sosCountdownSeconds || 10,
                    fakeCallLineNumber: settings?.fakeCallLineNumber || response.user.emergencyLineNumber || '',
                    sirenPassword: settings?.sirenPassword || '122',
                    sirenVolume: settings?.sirenVolume || 'high',
                    sirenAutoStopSeconds: settings?.sirenAutoStopSeconds || 60,
                    watchSensitivity: settings?.watchSensitivity || 'medium',
                    silentEmergencyMode: settings?.silentEmergencyMode || 'sound-alarm',
                    fakeCallAudioUrl: settings?.fakeCallAudioUrl || '',
                    fakeCallAudioName: settings?.fakeCallAudioName || '',
                });
            } catch (error) {
                if (mounted) {
                    setErrorMessage(error instanceof Error ? error.message : 'Unable to load safety settings.');
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

    const updateField = <K extends keyof typeof formValues>(key: K, value: (typeof formValues)[K]) => {
        setFormValues((currentValues) => ({
            ...currentValues,
            [key]: value,
        }));
    };

    const pickFakeCallAudio = async () => {
        if (!token) {
            setErrorMessage('Sign in again to upload a ringtone.');
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled || !result.assets[0]?.uri) {
                return;
            }

            setUploadingAudio(true);
            setErrorMessage('');

            const audioAsset = result.assets[0];
            const uploaded = await uploadMediaFile(token, {
                uri: audioAsset.uri,
                folder: 'nirapodai/fake-call-audio',
                name: audioAsset.name,
                type: audioAsset.mimeType,
            });

            setFormValues((currentValues) => ({
                ...currentValues,
                fakeCallAudioUrl: uploaded.url,
                fakeCallAudioName: result.assets[0]?.name || 'Custom ringtone',
            }));
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to upload ringtone right now.');
        } finally {
            setUploadingAudio(false);
        }
    };

    const handleSave = async () => {
        if (!token) {
            setErrorMessage('Sign in again to save safety settings.');
            return;
        }

        try {
            setSaving(true);
            setErrorMessage('');

            await updateProfile(token, {
                emergencyLineNumber: formValues.fakeCallLineNumber,
                safetySettings: {
                    ...formValues,
                },
            });
            await refreshSession();
            Alert.alert('Safety settings saved', 'Your emergency behavior settings have been updated.');
            router.back();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to save safety settings right now.');
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
                    <Text style={styles.headerTitle}>Safety settings</Text>
                    <Text style={styles.headerSubtitle}>Control how emergencies behave</Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#C84D61" />
                </View>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryIconWrap}>
                            <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#C84D61" />
                        </View>
                        <View style={styles.summaryTextWrap}>
                            <Text style={styles.summaryTitle}>Emergency behavior</Text>
                            <Text style={styles.summaryText}>Tune the SOS countdown, alert scope, siren, watch trigger, and fake-call audio.</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionFormTitle}>SOS countdown</Text>
                    <View style={styles.choiceRow}>
                        {safetyCountdownOptions.map((option) => (
                            <ChoiceChip
                                key={option}
                                label={`${option}s`}
                                active={formValues.sosCountdownSeconds === option}
                                onPress={() => updateField('sosCountdownSeconds', option)}
                            />
                        ))}
                    </View>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionFormTitle}>Siren password</Text>
                    <Text style={styles.sectionFormHelper}>Set the password required to stop the emergency siren on this device.</Text>
                    <ProfileInput
                        label="Cancel password"
                        value={formValues.sirenPassword}
                        onChangeText={(value) => updateField('sirenPassword', value)}
                        placeholder="Enter siren password"
                        secureTextEntry
                    />
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionFormTitle}>Fake call number</Text>
                    <ProfileInput
                        label="Emergency line"
                        value={formValues.fakeCallLineNumber}
                        onChangeText={(value) => updateField('fakeCallLineNumber', value)}
                        placeholder="Enter fake call number"
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionFormTitle}>Fake call audio</Text>
                    <Text style={styles.sectionFormHelper}>Choose a ringtone or audio clip that the fake incoming call should play.</Text>

                    <Pressable style={styles.photoButton} onPress={() => void pickFakeCallAudio()} accessibilityRole="button" disabled={uploadingAudio}>
                        <MaterialCommunityIcons name="music-note-plus" size={18} color="#C84D61" />
                        <Text style={styles.photoButtonText}>{uploadingAudio ? 'Uploading...' : formValues.fakeCallAudioName ? 'Change ringtone' : 'Select ringtone audio'}</Text>
                    </Pressable>

                    <Text style={styles.ringtoneMetaText}>{formValues.fakeCallAudioName ? `Selected: ${formValues.fakeCallAudioName}` : 'No custom audio selected yet.'}</Text>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionFormTitle}>Siren and watch</Text>
                    <Text style={styles.sectionFormHelper}>Adjust alarm volume, auto-stop time, audio distress sensitivity, and silent mode behavior.</Text>

                    <View style={styles.choiceBlock}>
                        <Text style={styles.choiceLabel}>Siren volume</Text>
                        <View style={styles.choiceRow}>
                            {sirenVolumeOptions.map((option) => (
                                <ChoiceChip key={option.value} label={option.label} active={formValues.sirenVolume === option.value} onPress={() => updateField('sirenVolume', option.value)} />
                            ))}
                        </View>
                    </View>

                    <View style={styles.choiceBlock}>
                        <Text style={styles.choiceLabel}>Siren auto-stop</Text>
                        <View style={styles.choiceRow}>
                            {[30, 60, 90].map((option) => (
                                <ChoiceChip key={option} label={`${option}s`} active={formValues.sirenAutoStopSeconds === option} onPress={() => updateField('sirenAutoStopSeconds', option)} />
                            ))}
                        </View>
                    </View>

                    <View style={styles.choiceBlock}>
                        <Text style={styles.choiceLabel}>Watch/audio trigger sensitivity</Text>
                        <View style={styles.choiceRow}>
                            {watchSensitivityOptions.map((option) => (
                                <ChoiceChip key={option.value} label={option.label} active={formValues.watchSensitivity === option.value} onPress={() => updateField('watchSensitivity', option.value)} />
                            ))}
                        </View>
                    </View>

                    <View style={styles.choiceBlock}>
                        <Text style={styles.choiceLabel}>Silent emergency mode</Text>
                        <View style={styles.choiceStack}>
                            {silentModeOptions.map((option) => (
                                <ChoiceChip key={option.value} label={option.label} active={formValues.silentEmergencyMode === option.value} onPress={() => updateField('silentEmergencyMode', option.value)} />
                            ))}
                        </View>
                    </View>
                </View>

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
                <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={() => void handleSave()} accessibilityRole="button" disabled={saving || loading}>
                    <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
                </Pressable>
            </View>
        </View>
    );
}

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={[styles.choiceChip, active && styles.choiceChipActive]} accessibilityRole="button">
            <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>{label}</Text>
        </Pressable>
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
    secureTextEntry,
}: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'phone-pad';
    multiline?: boolean;
    secureTextEntry?: boolean;
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
                secureTextEntry={secureTextEntry}
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
    choiceRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    choiceStack: {
        gap: 10,
    },
    choiceBlock: {
        gap: 10,
    },
    choiceLabel: {
        color: '#1D1D1F',
        fontSize: 14,
        fontWeight: '800',
    },
    choiceDescription: {
        color: '#7D6A70',
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '600',
    },
    choiceChip: {
        minHeight: 44,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: '#F8EEF0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    choiceChipActive: {
        backgroundColor: '#C84D61',
    },
    choiceChipText: {
        color: '#C84D61',
        fontSize: 13,
        fontWeight: '800',
    },
    choiceChipTextActive: {
        color: '#FFFFFF',
    },
    ringtoneMetaText: {
        color: '#7D6A70',
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    toggleCopy: {
        flex: 1,
        gap: 4,
    },
    toggleChip: {
        width: 54,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EAD8DC',
        padding: 4,
        justifyContent: 'center',
    },
    toggleChipActive: {
        backgroundColor: '#C84D61',
    },
    toggleDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignSelf: 'flex-start',
    },
    toggleDotActive: {
        alignSelf: 'flex-end',
    },
    summaryCard: {
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.98)',
        padding: 18,
        gap: 14,
        shadowColor: '#7A2434',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    summaryIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F8EEF0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryTextWrap: {
        flex: 1,
        gap: 4,
    },
    summaryTitle: {
        color: '#1D1D1F',
        fontSize: 18,
        fontWeight: '900',
    },
    summaryText: {
        color: '#7D6A70',
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '600',
    },
    summaryActions: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    primaryInlineButton: {
        flex: 1,
        minHeight: 50,
        borderRadius: 999,
        backgroundColor: '#C84D61',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    primaryInlineButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
    },
    countBadge: {
        minHeight: 50,
        borderRadius: 999,
        paddingHorizontal: 14,
        backgroundColor: '#F8EEF0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    countBadgeText: {
        color: '#C84D61',
        fontSize: 13,
        fontWeight: '800',
    },
    sectionFormTitle: {
        color: '#1D1D1F',
        fontSize: 18,
        fontWeight: '900',
    },
    sectionFormHelper: {
        color: '#7D6A70',
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '600',
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
    contactFormActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    formGhostButton: {
        minHeight: 52,
        borderRadius: 999,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8EEF0',
    },
    formGhostButtonText: {
        color: '#C84D61',
        fontSize: 14,
        fontWeight: '800',
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(200,77,97,0.08)',
    },
    contactAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactAvatarText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '900',
    },
    contactDetails: {
        flex: 1,
        gap: 2,
    },
    contactName: {
        color: '#1D1D1F',
        fontSize: 15,
        fontWeight: '900',
    },
    contactPhone: {
        color: '#7D6A70',
        fontSize: 12,
        fontWeight: '700',
    },
    contactRelationship: {
        color: '#8F6A73',
        fontSize: 11,
        fontWeight: '700',
    },
    appUserBadge: {
        color: '#2F7E52',
        fontSize: 11,
        fontWeight: '800',
    },
    nonAppUserBadge: {
        color: '#B85A6B',
        fontSize: 11,
        fontWeight: '800',
    },
    contactActionStack: {
        gap: 8,
    },
    smallActionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F8EEF0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#7D6A70',
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '600',
    },
    listHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    listMetaText: {
        color: '#B85A6B',
        fontSize: 12,
        fontWeight: '800',
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
