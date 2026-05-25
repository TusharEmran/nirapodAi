const User = require('../models/User');
const ChatThread = require('../models/ChatThread');

function normalizePhone(value) {
    return String(value || '').trim().replace(/[\s()-]/g, '');
}

function buildAvatarColor(name) {
    const colors = ['#7AB0C0', '#C9A56C', '#6E8B73', '#B85A6B', '#8D78C6'];
    const value = String(name || '').split('').reduce((total, character) => total + character.charCodeAt(0), 0);
    return colors[value % colors.length];
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

function contactToResponse(contact) {
    return {
        id: contact._id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship || '',
        initials: buildInitials(contact.name),
        avatar: buildAvatarColor(contact.name),
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
    };
}

async function contactToResponseWithAppUser(contact, ownerId) {
    const appUser = await User.findOne({
        phone: normalizePhone(contact.phone),
        _id: { $ne: ownerId },
    }).select('_id');

    return {
        ...contactToResponse(contact),
        isAppUser: Boolean(appUser),
    };
}

function profileUser(user) {
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
        emergencyContacts: Array.isArray(user.emergencyContacts) ? user.emergencyContacts.map(contactToResponse) : [],
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

async function getProfile(req, res, next) {
    try {
        const user = await User.findById(req.user.sub);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            user: profileUser(user),
        });
    } catch (error) {
        return next(error);
    }
}

async function updateProfile(req, res, next) {
    try {
        const user = await User.findById(req.user.sub);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const fullName = String(req.body.fullName || user.fullName).trim();
        const phone = String(req.body.phone || user.phone).trim().replace(/[\s()-]/g, '');
        const city = String(req.body.city || '').trim();
        const primaryContact = String(req.body.primaryContact || '').trim();
        const secondaryContact = String(req.body.secondaryContact || '').trim();
        const medicalNote = String(req.body.medicalNote || '').trim();
        const emergencyLineNumber = String(req.body.emergencyLineNumber || '').trim().replace(/[\s()-]/g, '');
        const profileImageUrl = String(req.body.profileImageUrl || '').trim();

        if (!fullName || !phone) {
            return res.status(400).json({ success: false, message: 'fullName and phone are required' });
        }

        const duplicatePhone = await User.findOne({ phone, _id: { $ne: user._id } });

        if (duplicatePhone) {
            return res.status(409).json({ success: false, message: 'That phone number is already in use' });
        }

        user.fullName = fullName;
        user.phone = phone;
        user.city = city;
        user.primaryContact = primaryContact;
        user.secondaryContact = secondaryContact;
        user.medicalNote = medicalNote;
        user.emergencyLineNumber = emergencyLineNumber;
        user.profileImageUrl = profileImageUrl;

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: profileUser(user),
        });
    } catch (error) {
        return next(error);
    }
}

async function getContacts(req, res, next) {
    try {
        const user = await User.findById(req.user.sub);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            contacts: Array.isArray(user.emergencyContacts)
                ? await Promise.all(user.emergencyContacts.map((contact) => contactToResponseWithAppUser(contact, user._id)))
                : [],
        });
    } catch (error) {
        return next(error);
    }
}

async function addContact(req, res, next) {
    try {
        const user = await User.findById(req.user.sub);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const name = String(req.body.name || '').trim();
        const phone = normalizePhone(req.body.phone);
        const relationship = String(req.body.relationship || '').trim();

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'name and phone are required' });
        }

        const duplicate = (user.emergencyContacts || []).some((contact) => normalizePhone(contact.phone) === phone);

        if (duplicate) {
            return res.status(409).json({ success: false, message: 'That contact already exists' });
        }

        user.emergencyContacts.push({
            name,
            phone,
            relationship,
        });

        await user.save();

        const savedContact = user.emergencyContacts[user.emergencyContacts.length - 1];
        const appUser = await User.findOne({
            phone,
            _id: { $ne: user._id },
        }).select('_id');

        if (appUser) {
            await ChatThread.findOneAndUpdate(
                { ownerId: user._id, contactId: String(savedContact._id) },
                {
                    ownerId: user._id,
                    contactId: String(savedContact._id),
                    contactName: savedContact.name,
                    subtitle: savedContact.relationship || 'App user',
                    accent: buildAvatarColor(savedContact.name),
                    unread: false,
                    lastMessage: '',
                    lastMessageAt: null,
                    messages: [],
                },
                { upsert: true, new: true, setDefaultsOnInsert: true },
            );
        }

        return res.status(201).json({
            success: true,
            message: 'Contact added successfully',
            contacts: await Promise.all(user.emergencyContacts.map((contact) => contactToResponseWithAppUser(contact, user._id))),
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getProfile,
    updateProfile,
    getContacts,
    addContact,
};
