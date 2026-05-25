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
        otp: { type: otpSchema, default: () => ({}) },
        lastLoginAt: { type: Date, default: null },
    },
    { timestamps: true },
);

module.exports = mongoose.model('User', userSchema);
