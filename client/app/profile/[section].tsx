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
    const { token, refreshSession, user, updateUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [fieldValues, setFieldValues] = useState({
        fullName: user?.fullName || '',
        phone: user?.phone || '',
        city: user?.city || '',
        primaryContact: user?.primaryContact || '',
        secondaryContact: user?.secondaryContact || '',
        medicalNote: user?.medicalNote || '',
        emergencyLineNumber: user?.emergencyLineNumber || '',
        profileImageUrl: user?.profileImageUrl || '',
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
                    const message = error instanceof Error ? error.message : 'Unable to load profile.';
                    if (!message.includes('Unable to reach the auth server')) {
                        setErrorMessage(message);
                    }
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
            const message = error instanceof Error ? error.message : 'Unable to save changes right now.';
            if (message.includes('Unable to reach the auth server')) {
                updateUser({
                    fullName: fieldValues.fullName,
                    phone: fieldValues.phone,
                    city: fieldValues.city,
                    primaryContact: fieldValues.primaryContact,
                    secondaryContact: fieldValues.secondaryContact,
                    medicalNote: fieldValues.medicalNote,
                    emergencyLineNumber: fieldValues.emergencyLineNumber,
                    profileImageUrl: fieldValues.profileImageUrl,
                });
                Alert.alert('Saved offline', 'Your profile details will sync when you are back online.');
                router.back();
            } else {
                setErrorMessage(message);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#FAFAFA" />
                </Pressable>

                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>Edit profile</Text>
                    <Text style={styles.headerSubtitle}>Update your personal details</Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="account-edit-outline" size={20} color="#FAFAFA" />
                </View>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <View style={styles.heroAvatarWrap}>
                        {fieldValues.profileImageUrl ? (
                            <Image source={{ uri: fieldValues.profileImageUrl }} style={styles.heroAvatarImage} contentFit="cover" />
                        ) : (
                            <View style={styles.heroIconWrap}>
                                <MaterialCommunityIcons name="account-edit-outline" size={28} color="#FAFAFA" />
                            </View>
                        )}
                    </View>
                    <Text style={styles.heroTitle}>Edit profile</Text>
                    <Text style={styles.heroText}>
                        These details are stored in MongoDB and used across the profile tab and emergency flow.
                    </Text>

                    <Pressable style={styles.photoButton} onPress={() => void pickProfileImage()} accessibilityRole="button" disabled={uploadingImage}>
                        <MaterialCommunityIcons name="image-edit-outline" size={18} color="#FAFAFA" />
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
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FAFAFA" />
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
    const { token, refreshSession, user, updateUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [contacts, setContacts] = useState<EmergencyContact[]>(user?.emergencyContacts || []);
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
                    const message = error instanceof Error ? error.message : 'Unable to load contacts.';
                    if (!message.includes('Unable to reach the auth server')) {
                        setErrorMessage(message);
                    }
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

        const payload = {
            name: formValues.name.trim(),
            phone: formValues.phone.trim(),
            relationship: formValues.relationship.trim(),
        };

        try {
            setSaving(true);
            setErrorMessage('');

            const response = mode === 'edit' && selectedContactId
                ? await updateContact(token, selectedContactId, payload)
                : await addContact(token, payload);

            setContacts(response.contacts);
            await refreshSession();
            resetForm();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to save this contact right now.';
            if (message.includes('Unable to reach the auth server')) {
                let nextContacts = contacts;
                if (mode === 'edit' && selectedContactId) {
                    nextContacts = contacts.map((c) => (c.id === selectedContactId ? { ...c, ...payload } : c));
                } else {
                    nextContacts = [...contacts, {
                        id: `temp-${Date.now()}`,
                        name: payload.name,
                        phone: payload.phone,
                        relationship: payload.relationship,
                        initials: payload.name.substring(0, 2).toUpperCase(),
                        avatar: '#27272A'
                    }];
                }
                setContacts(nextContacts);
                updateUser({ emergencyContacts: nextContacts });
                Alert.alert('Saved offline', 'Contact changes will sync when you are back online.');
                resetForm();
            } else {
                setErrorMessage(message);
            }
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
                            const message = error instanceof Error ? error.message : 'Unable to delete this contact right now.';
                            if (message.includes('Unable to reach the auth server')) {
                                const nextContacts = contacts.filter((c) => c.id !== contact.id);
                                setContacts(nextContacts);
                                updateUser({ emergencyContacts: nextContacts });
                                Alert.alert('Deleted offline', 'Contact will be fully removed when you are back online.');
                                if (selectedContactId === contact.id) {
                                    resetForm();
                                }
                            } else {
                                setErrorMessage(message);
                            }
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
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#FAFAFA" />
                </Pressable>

                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>Emergency contacts</Text>
                    <Text style={styles.headerSubtitle}>Add, edit, or delete trusted contacts</Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="account-multiple-outline" size={20} color="#FAFAFA" />
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
                            <MaterialCommunityIcons name="loading" size={18} color="#FAFAFA" />
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
                                    <MaterialCommunityIcons name="pencil-outline" size={18} color="#FAFAFA" />
                                </Pressable>
                                <Pressable style={styles.smallActionButton} onPress={() => handleDelete(contact)} accessibilityRole="button">
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FAFAFA" />
                                </Pressable>
                            </View>
                        </View>
                    )) : (
                        loading ? null : <Text style={styles.emptyText}>No emergency contacts yet. Add your first trusted contact above.</Text>
                    )}
                </View>

                {errorMessage ? (
                    <View style={styles.tipCard}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FAFAFA" />
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
    const { token, refreshSession, user, updateUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    const settings = user?.safetySettings;
    const [formValues, setFormValues] = useState({
        sosCountdownSeconds: settings?.sosCountdownSeconds || 10,
        fakeCallLineNumber: settings?.fakeCallLineNumber || user?.emergencyLineNumber || '',
        sirenPassword: settings?.sirenPassword || '122',
        sirenVolume: settings?.sirenVolume || 'high',
        sirenAutoStopSeconds: settings?.sirenAutoStopSeconds || 60,
        watchSensitivity: settings?.watchSensitivity || 'medium',
        silentEmergencyMode: settings?.silentEmergencyMode || 'sound-alarm',
        fakeCallAudioUrl: settings?.fakeCallAudioUrl || '',
        fakeCallAudioName: settings?.fakeCallAudioName || '',
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
                    const message = error instanceof Error ? error.message : 'Unable to load safety settings.';
                    if (!message.includes('Unable to reach the auth server')) {
                        setErrorMessage(message);
                    }
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
            const message = error instanceof Error ? error.message : 'Unable to save safety settings right now.';
            if (message.includes('Unable to reach the auth server')) {
                updateUser({
                    emergencyLineNumber: formValues.fakeCallLineNumber,
                    safetySettings: {
                        ...(user?.safetySettings as SafetySettings),
                        ...formValues,
                    }
                });
                Alert.alert('Saved offline', 'Your safety settings will sync when you are back online.');
                router.back();
            } else {
                setErrorMessage(message);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#FAFAFA" />
                </Pressable>

                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>Safety settings</Text>
                    <Text style={styles.headerSubtitle}>Control how emergencies behave</Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#FAFAFA" />
                </View>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryIconWrap}>
                            <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#FAFAFA" />
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
                        <MaterialCommunityIcons name="music-note-plus" size={18} color="#FAFAFA" />
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
                        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FAFAFA" />
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
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#FAFAFA" />
                </Pressable>

                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>{config.title}</Text>
                    <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
                </View>

                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name={config.icon} size={20} color="#FAFAFA" />
                </View>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroCard}>
                    <View style={styles.heroIconWrap}>
                        <MaterialCommunityIcons name={config.icon} size={28} color="#FAFAFA" />
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
                    <MaterialCommunityIcons name="information-outline" size={18} color="#FAFAFA" />
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
        backgroundColor: '#09090B',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 48,
        paddingBottom: 20,
        gap: 16,
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
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        color: '#FAFAFA',
        fontSize: 20,
        fontWeight: '900',
    },
    headerSubtitle: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
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
    body: {
        flex: 1,
    },
    bodyContent: {
        padding: 20,
        gap: 16,
        paddingBottom: 100,
    },
    heroCard: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#18181B',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#27272A',
        gap: 12,
    },
    heroAvatarWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#09090B',
    },
    heroIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 48,
    },
    heroTitle: {
        color: '#FAFAFA',
        fontSize: 20,
        fontWeight: '900',
    },
    heroText: {
        color: '#A1A1AA',
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 18,
    },
    photoButton: {
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: '#27272A',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    photoButtonText: {
        color: '#FAFAFA',
        fontSize: 13,
        fontWeight: '800',
    },
    sectionCard: {
        borderRadius: 28,
        backgroundColor: '#18181B',
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    sectionHeader: {
        gap: 4,
    },
    sectionTitle: {
        color: '#FAFAFA',
        fontSize: 18,
        fontWeight: '900',
    },
    sectionSubtitle: {
        color: '#71717A',
        fontSize: 13,
        fontWeight: '600',
    },
    settingRow: {
        gap: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
    },
    settingRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    settingLabel: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    
    choiceBlock: {
        gap: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
    },
    choiceStack: {
        gap: 8,
    },
    choiceGroup: {
        gap: 12,
        marginTop: 4,
    },
    choiceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    choiceTextWrap: {
        flex: 1,
        gap: 4,
    },
    choiceLabel: {
        color: '#FAFAFA',
        fontSize: 15,
        fontWeight: '800',
    },
    choiceDescription: {
        color: '#71717A',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    choiceChip: {
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: '#09090B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#27272A',
    },
    choiceChipActive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    choiceChipText: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '800',
    },
    choiceChipTextActive: {
        color: '#FAFAFA',
    },
    ringtoneMetaText: {
        color: '#A1A1AA',
        fontSize: 13,
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
        width: 56,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#27272A',
        padding: 4,
        justifyContent: 'center',
    },
    toggleChipActive: {
        backgroundColor: '#10B981',
    },
    toggleDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FAFAFA',
        alignSelf: 'flex-start',
    },
    toggleDotActive: {
        alignSelf: 'flex-end',
    },
    summaryCard: {
        borderRadius: 24,
        backgroundColor: '#18181B',
        padding: 20,
        gap: 14,
        borderWidth: 1,
        borderColor: '#27272A',
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
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryTextWrap: {
        flex: 1,
        gap: 4,
    },
    summaryTitle: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '900',
    },
    summaryText: {
        color: '#71717A',
        fontSize: 13,
        lineHeight: 20,
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
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    primaryInlineButtonText: {
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '900',
    },
    countBadge: {
        minHeight: 50,
        borderRadius: 999,
        paddingHorizontal: 16,
        backgroundColor: '#27272A',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    countBadgeText: {
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '800',
    },
    sectionFormTitle: {
        color: '#FAFAFA',
        fontSize: 18,
        fontWeight: '900',
    },
    sectionFormHelper: {
        color: '#A1A1AA',
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '600',
    },
    formCard: {
        borderRadius: 28,
        backgroundColor: '#18181B',
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    fieldBlock: {
        gap: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
    },
    fieldBlockLast: {
        paddingBottom: 0,
        borderBottomWidth: 0,
    },
    fieldLabel: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        minHeight: 52,
        borderRadius: 16,
        backgroundColor: '#09090B',
        borderWidth: 1,
        borderColor: '#27272A',
        paddingHorizontal: 16,
        color: '#FAFAFA',
        fontSize: 15,
        fontWeight: '600',
    },
    textArea: {
        minHeight: 100,
        paddingTop: 16,
        textAlignVertical: 'top',
    },
    contactFormActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    formGhostButton: {
        minHeight: 52,
        borderRadius: 999,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#27272A',
    },
    formGhostButtonText: {
        color: '#FAFAFA',
        fontSize: 14,
        fontWeight: '800',
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
    },
    contactAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactAvatarText: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '900',
    },
    contactDetails: {
        flex: 1,
        gap: 4,
    },
    contactName: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '900',
    },
    contactPhone: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '600',
    },
    contactRelationship: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    appUserBadge: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '800',
        marginTop: 2,
    },
    nonAppUserBadge: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '800',
        marginTop: 2,
    },
    contactActionStack: {
        flexDirection: 'row',
        gap: 8,
    },
    smallActionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#71717A',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    listHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    listMetaText: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '800',
    },
    tipCard: {
        borderRadius: 20,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tipText: {
        flex: 1,
        color: '#FAFAFA',
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '600',
    },
    loadingText: {
        color: '#71717A',
        fontSize: 15,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 8,
    },
    secondaryButton: {
        flex: 1,
        minHeight: 56,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
    },
    secondaryButtonText: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '800',
    },
    primaryButton: {
        flex: 1,
        minHeight: 56,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EF4444',
    },
    primaryButtonDisabled: {
        opacity: 0.5,
    },
    primaryButtonText: {
        color: '#FAFAFA',
        fontSize: 16,
        fontWeight: '800',
    },
});