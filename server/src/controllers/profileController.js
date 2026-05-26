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

async function syncContactThread(user, contact) {
    const appUser = await User.findOne({
        phone: normalizePhone(contact.phone),
        _id: { $ne: user._id },
    }).select('_id');

    const threadFilter = { ownerId: user._id, contactId: String(contact._id) };

    if (!appUser) {
        await ChatThread.deleteOne(threadFilter);

        return;
    }

    await ChatThread.findOneAndUpdate(
        threadFilter,
        {
            ownerId: user._id,
            contactId: String(contact._id),
            contactName: contact.name,
            subtitle: contact.relationship || 'App user',
            accent: buildAvatarColor(contact.name),
            unread: false,
            lastMessage: '',
            lastMessageAt: null,
            messages: [],
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );
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
        safetySettings: user.safetySettings || {},
        privacySettings: user.privacySettings || {},
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

        const fullName = req.body.fullName !== undefined ? String(req.body.fullName).trim() : user.fullName;
        const phone = req.body.phone !== undefined ? String(req.body.phone).trim().replace(/[\s()-]/g, '') : user.phone;
        const city = req.body.city !== undefined ? String(req.body.city).trim() : user.city || '';
        const primaryContact = req.body.primaryContact !== undefined ? String(req.body.primaryContact).trim() : user.primaryContact || '';
        const secondaryContact = req.body.secondaryContact !== undefined ? String(req.body.secondaryContact).trim() : user.secondaryContact || '';
        const medicalNote = req.body.medicalNote !== undefined ? String(req.body.medicalNote).trim() : user.medicalNote || '';
        const emergencyLineNumber = req.body.emergencyLineNumber !== undefined ? String(req.body.emergencyLineNumber).trim().replace(/[\s()-]/g, '') : user.emergencyLineNumber || '';
        const profileImageUrl = req.body.profileImageUrl !== undefined ? String(req.body.profileImageUrl).trim() : user.profileImageUrl || '';

        const safetySettings = req.body.safetySettings || {};
        const privacySettings = req.body.privacySettings || {};

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
        user.safetySettings = {
            ...(user.safetySettings?.toObject?.() || user.safetySettings || {}),
            ...safetySettings,
        };
        user.privacySettings = {
            ...(user.privacySettings?.toObject?.() || user.privacySettings || {}),
            ...privacySettings,
        };

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
        await syncContactThread(user, savedContact);

        return res.status(201).json({
            success: true,
            message: 'Contact added successfully',
            contacts: await Promise.all(user.emergencyContacts.map((contact) => contactToResponseWithAppUser(contact, user._id))),
        });
    } catch (error) {
        return next(error);
    }
}

async function updateContact(req, res, next) {
    try {
        const user = await User.findById(req.user.sub);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const contact = user.emergencyContacts.id(req.params.contactId);

        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }

        const name = String(req.body.name || contact.name).trim();
        const phone = normalizePhone(req.body.phone || contact.phone);
        const relationship = String(req.body.relationship || contact.relationship || '').trim();

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'name and phone are required' });
        }

        const duplicate = (user.emergencyContacts || []).some((item) => String(item._id) !== String(contact._id) && normalizePhone(item.phone) === phone);

        if (duplicate) {
            return res.status(409).json({ success: false, message: 'That contact already exists' });
        }

        contact.name = name;
        contact.phone = phone;
        contact.relationship = relationship;

        await user.save();
        await syncContactThread(user, contact);

        return res.status(200).json({
            success: true,
            message: 'Contact updated successfully',
            contacts: await Promise.all(user.emergencyContacts.map((item) => contactToResponseWithAppUser(item, user._id))),
        });
    } catch (error) {
        return next(error);
    }
}

async function deleteContact(req, res, next) {
    try {
        const user = await User.findById(req.user.sub);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const contact = user.emergencyContacts.id(req.params.contactId);

        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }

        user.emergencyContacts.pull(contact._id);
        await user.save();

        await ChatThread.deleteOne({ ownerId: user._id, contactId: String(contact._id) });

        return res.status(200).json({
            success: true,
            message: 'Contact deleted successfully',
            contacts: await Promise.all(user.emergencyContacts.map((item) => contactToResponseWithAppUser(item, user._id))),
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
    updateContact,
    deleteContact,
};
