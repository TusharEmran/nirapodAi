import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
            { label: 'Full name', placeholder: 'Enter your full name', value: 'Her Shield User' },
            { label: 'Phone number', placeholder: 'Enter your phone number', value: '+233 501 497 265' },
            { label: 'City', placeholder: 'Enter your city', value: 'Accra' },
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
        icon: 'shield-cog-outline',
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
                    <Text style={styles.tipText}>Changes here are local UI edits for now. You can connect them to storage later.</Text>
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
    heroIconWrap: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#C84D61',
        alignItems: 'center',
        justifyContent: 'center',
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
    primaryButtonText: {
        color: '#C84D61',
        fontSize: 15,
        fontWeight: '800',
    },
});
