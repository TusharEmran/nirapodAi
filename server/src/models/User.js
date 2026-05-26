const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
    {
        codeHash: { type: String, default: null },
        expiresAt: { type: Date, default: null },
        purpose: { type: String, enum: ['signup', 'login'], default: null },
    },
    { _id: false },
);

const emergencyContactSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        relationship: { type: String, default: '', trim: true },
    },
    { _id: true, timestamps: true },
);

const safetySettingsSchema = new mongoose.Schema(
    {
        sosCountdownSeconds: { type: Number, default: 10 },
        alertRecipients: { type: String, enum: ['all-contacts', 'priority-contacts', 'favorites'], default: 'all-contacts' },
        liveLocationMode: { type: String, enum: ['always', 'sos-only', 'manual'], default: 'sos-only' },
        fakeCallLineNumber: { type: String, default: '', trim: true },
        sirenPassword: { type: String, default: '122', trim: true },
        sirenVolume: { type: String, enum: ['low', 'medium', 'high'], default: 'high' },
        sirenAutoStopSeconds: { type: Number, default: 60 },
        watchSensitivity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        silentEmergencyMode: { type: String, enum: ['vibrate-only', 'flash-screen', 'sound-alarm'], default: 'sound-alarm' },
        testSosMode: { type: Boolean, default: false },
        fakeCallAudioUrl: { type: String, default: '', trim: true },
        fakeCallAudioName: { type: String, default: '', trim: true },
    },
    { _id: false },
);

const privacySettingsSchema = new mongoose.Schema(
    {
        profileVisibility: { type: String, enum: ['public', 'contacts-only', 'private'], default: 'contacts-only' },
        locationHistoryRetention: { type: String, enum: ['off', '24-hours', '7-days', '30-days'], default: 'off' },
        messageAccess: { type: String, enum: ['anyone', 'contacts', 'app-users'], default: 'contacts' },
        showOnlineStatus: { type: Boolean, default: true },
        hidePhoneNumber: { type: Boolean, default: false },
    },
    { _id: false },
);

const userSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        phone: { type: String, required: true, unique: true, trim: true },
        passwordHash: { type: String, required: true },
        isVerified: { type: Boolean, default: false },
        city: { type: String, default: '', trim: true },
        primaryContact: { type: String, default: '', trim: true },
        secondaryContact: { type: String, default: '', trim: true },
        medicalNote: { type: String, default: '', trim: true },
        emergencyLineNumber: { type: String, default: '', trim: true },
        profileImageUrl: { type: String, default: '', trim: true },
        emergencyContacts: { type: [emergencyContactSchema], default: [] },
        safetySettings: { type: safetySettingsSchema, default: () => ({}) },
        privacySettings: { type: privacySettingsSchema, default: () => ({}) },
        otp: { type: otpSchema, default: () => ({}) },
        lastLoginAt: { type: Date, default: null },
    },
    { timestamps: true },
);

module.exports = mongoose.model('User', userSchema);
