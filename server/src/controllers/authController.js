const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { buildOtpExpiry, generateOtpCode } = require('../utils/otp');

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
    return String(value || '').trim().replace(/[\s()-]/g, '');
}

function issueToken(user) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('JWT_SECRET is not set');
    }

    return jwt.sign(
        {
            sub: user._id.toString(),
            email: user.email,
            phone: user.phone,
            fullName: user.fullName,
        },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );
}

function buildInitials(name) {
    return String(name || '')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0] || '')
        .join('')
        .toUpperCase() || '??';
}

function buildAvatarColor(name) {
    const colors = ['#7AB0C0', '#C9A56C', '#6E8B73', '#B85A6B', '#8D78C6'];
    const value = String(name || '').split('').reduce((total, character) => total + character.charCodeAt(0), 0);
    return colors[value % colors.length];
}

async function storeOtp(user, purpose) {
    const otpCode = generateOtpCode(6);
    const otpHash = await bcrypt.hash(otpCode, 10);

    user.otp = {
        codeHash: otpHash,
        expiresAt: buildOtpExpiry(Number(process.env.OTP_TTL_MINUTES || 10)),
        purpose,
    };

    await user.save();
    return otpCode;
}

async function sendOtpEmail(user, otpCode, purpose) {
    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
        console.warn('EmailJS credentials are not set; skipping OTP email send.');
        return { sent: false, reason: 'missing_credentials' };
    }

    const response = await fetch(EMAILJS_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            service_id: serviceId,
            template_id: templateId,
            user_id: publicKey,
            template_params: {
                name: user.fullName,
                user_name: user.fullName,
                to_email: user.email,
                to_name: user.fullName,
                full_name: user.fullName,
                email: user.email,
                phone: user.phone,
                code: otpCode,
                otp_code: otpCode,
                otp: otpCode,
                verification_code: otpCode,
                purpose,
                app_name: 'Her Shield',
                from_name: process.env.EMAILJS_FROM_NAME || 'Her Shield',
                expires_in_minutes: Number(process.env.OTP_TTL_MINUTES || 10),
                message: `Your Her Shield OTP is ${otpCode}. It expires in ${Number(process.env.OTP_TTL_MINUTES || 10)} minutes.`,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.warn(`EmailJS request failed: ${response.status} ${errorText}`);
        return { sent: false, reason: 'emailjs_request_failed', status: response.status };
    }

    return { sent: true, response: await response.json() };
}

function publicUser(user) {
    return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        city: user.city || '',
        primaryContact: user.primaryContact || '',
        secondaryContact: user.secondaryContact || '',
        medicalNote: user.medicalNote || '',
        emergencyLineNumber: user.emergencyLineNumber || '',
        profileImageUrl: user.profileImageUrl || '',
        emergencyContacts: Array.isArray(user.emergencyContacts)
            ? user.emergencyContacts.map((contact) => ({
                id: contact._id,
                name: contact.name,
                phone: contact.phone,
                relationship: contact.relationship || '',
                createdAt: contact.createdAt,
                updatedAt: contact.updatedAt,
                initials: buildInitials(contact.name),
                avatar: buildAvatarColor(contact.name),
            }))
            : [],
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

function extractIdentifier(payload) {
    const email = normalizeEmail(payload.email || payload.identifier);
    const phone = normalizePhone(payload.phone || payload.identifier);

    return { email, phone };
}

async function signup(req, res, next) {
    try {
        const fullName = String(req.body.fullName || '').trim();
        const email = normalizeEmail(req.body.email);
        const phone = normalizePhone(req.body.phone);
        const password = String(req.body.password || '');

        if (!fullName || !email || !phone || !password) {
            return res.status(400).json({ success: false, message: 'fullName, email, phone and password are required' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });

        if (existingUser) {
            return res.status(409).json({ success: false, message: 'An account with that email or phone already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            fullName,
            email,
            phone,
            passwordHash,
            isVerified: false,
        });

        const otpCode = await storeOtp(user, 'signup');
        await sendOtpEmail(user, otpCode, 'signup');
        const devOtp = process.env.NODE_ENV === 'production' ? undefined : otpCode;

        return res.status(201).json({
            success: true,
            message: 'Account created. Verify the OTP to continue.',
            otpRequired: true,
            user: publicUser(user),
            challenge: {
                userId: user._id,
                expiresAt: user.otp.expiresAt,
                purpose: user.otp.purpose,
            },
            ...(devOtp ? { devOtp } : {}),
        });
    } catch (error) {
        return next(error);
    }
}

async function login(req, res, next) {
    try {
        const identifierPayload = extractIdentifier(req.body);
        const password = String(req.body.password || '');

        if ((!identifierPayload.email && !identifierPayload.phone) || !password) {
            return res.status(400).json({ success: false, message: 'identifier and password are required' });
        }

        const user = await User.findOne({
            $or: [
                identifierPayload.email ? { email: identifierPayload.email } : null,
                identifierPayload.phone ? { phone: identifierPayload.phone } : null,
            ].filter(Boolean),
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const otpCode = await storeOtp(user, 'login');
        await sendOtpEmail(user, otpCode, 'login');
        const devOtp = process.env.NODE_ENV === 'production' ? undefined : otpCode;

        return res.status(200).json({
            success: true,
            message: 'OTP sent. Verify to continue.',
            otpRequired: true,
            user: publicUser(user),
            challenge: {
                userId: user._id,
                expiresAt: user.otp.expiresAt,
                purpose: user.otp.purpose,
            },
            ...(devOtp ? { devOtp } : {}),
        });
    } catch (error) {
        return next(error);
    }
}

async function verifyOtp(req, res, next) {
    try {
        const { userId, email, phone, code } = req.body;
        const identifier = String(code || '').trim();

        if (!identifier || identifier.length !== 6) {
            return res.status(400).json({ success: false, message: 'A valid 6 digit code is required' });
        }

        const query = userId
            ? { _id: userId }
            : {
                $or: [
                    email ? { email: normalizeEmail(email) } : null,
                    phone ? { phone: normalizePhone(phone) } : null,
                ].filter(Boolean),
            };

        const user = await User.findOne(query);

        if (!user || !user.otp?.codeHash || !user.otp?.expiresAt) {
            return res.status(400).json({ success: false, message: 'OTP verification is not available for this account' });
        }

        if (user.otp.expiresAt.getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        const codeMatches = await bcrypt.compare(identifier, user.otp.codeHash);

        if (!codeMatches) {
            return res.status(401).json({ success: false, message: 'Invalid OTP code' });
        }

        user.isVerified = true;
        user.lastLoginAt = new Date();
        user.otp = { codeHash: null, expiresAt: null, purpose: null };
        await user.save();

        const token = issueToken(user);

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            token,
            user: publicUser(user),
        });
    } catch (error) {
        return next(error);
    }
}

async function resendOtp(req, res, next) {
    try {
        const identifierPayload = extractIdentifier(req.body);

        if (!identifierPayload.email && !identifierPayload.phone) {
            return res.status(400).json({ success: false, message: 'identifier is required' });
        }

        const user = await User.findOne({
            $or: [
                identifierPayload.email ? { email: identifierPayload.email } : null,
                identifierPayload.phone ? { phone: identifierPayload.phone } : null,
            ].filter(Boolean),
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        const purpose = user.isVerified ? 'login' : 'signup';
        const otpCode = await storeOtp(user, purpose);
        await sendOtpEmail(user, otpCode, purpose);
        const devOtp = process.env.NODE_ENV === 'production' ? undefined : otpCode;

        return res.status(200).json({
            success: true,
            message: 'A new OTP has been generated',
            otpRequired: true,
            user: publicUser(user),
            challenge: {
                userId: user._id,
                expiresAt: user.otp.expiresAt,
                purpose: user.otp.purpose,
            },
            ...(devOtp ? { devOtp } : {}),
        });
    } catch (error) {
        return next(error);
    }
}

async function me(req, res, next) {
    try {
        const user = await User.findById(req.user.sub);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            user: publicUser(user),
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    signup,
    login,
    verifyOtp,
    resendOtp,
    me,
};
