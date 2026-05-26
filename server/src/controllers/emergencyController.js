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

function buildMapsUrl(latitude, longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function buildBroadcastMessage(owner) {
    return `SOS ALERT from ${owner.fullName}. I need help right now.`;
}

function findMatchingContact(owner, appUser) {
    return (owner.emergencyContacts || []).find((contact) => normalizePhone(contact.phone) === normalizePhone(appUser.phone));
}

async function findOrCreateThread({ owner, contact, appUser, contactId, unread = false }) {
    let thread = await ChatThread.findOne({ ownerId: owner._id, contactId });
    const contactName = contact?.name || appUser.fullName;
    const subtitle = contact?.relationship || appUser.phone || 'App user';

    if (!thread) {
        thread = await ChatThread.create({
            ownerId: owner._id,
            contactId,
            contactName,
            subtitle,
            accent: buildAvatarColor(contactName),
            unread,
            lastMessage: '',
            lastMessageAt: null,
            messages: [],
        });
    } else {
        thread.contactName = contactName;
        thread.subtitle = subtitle;
        thread.accent = buildAvatarColor(contactName);
        await thread.save();
    }

    return thread;
}

async function appendMessage(thread, sender, text, locationUrl) {
    thread.messages.push({
        sender,
        text,
        imageUrl: '',
        locationUrl,
        read: sender === 'me',
    });
    thread.lastMessage = text;
    thread.lastMessageAt = new Date();
    thread.unread = sender === 'them';

    await thread.save();
}

async function sendSOSAlert(req, res, next) {
    try {
        const owner = await User.findById(req.user.sub).select('fullName phone emergencyContacts');

        if (!owner) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const latitude = Number(req.body.latitude);
        const longitude = Number(req.body.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
        }

        const locationUrl = buildMapsUrl(latitude, longitude);
        const defaultMessage = buildBroadcastMessage(owner);
        const contactPhones = (owner.emergencyContacts || []).map((contact) => normalizePhone(contact.phone)).filter(Boolean);

        const appUsers = await User.find({
            _id: { $ne: owner._id },
            phone: { $in: contactPhones },
        }).select('_id fullName phone');

        const appUsersByPhone = new Map(appUsers.map((appUser) => [normalizePhone(appUser.phone), appUser]));

        let notifiedCount = 0;
        let skippedCount = 0;

        for (const contact of owner.emergencyContacts || []) {
            const matchedUser = appUsersByPhone.get(normalizePhone(contact.phone));

            if (!matchedUser) {
                skippedCount += 1;
                continue;
            }

            const senderThread = await findOrCreateThread({
                owner,
                contact,
                appUser: matchedUser,
                contactId: String(contact._id),
            });
            await appendMessage(senderThread, 'me', defaultMessage, locationUrl);

            const reciprocalContact = findMatchingContact(matchedUser, owner);
            const recipientThread = await findOrCreateThread({
                owner: matchedUser,
                contact: reciprocalContact,
                appUser: owner,
                contactId: reciprocalContact ? String(reciprocalContact._id) : String(owner._id),
                unread: true,
            });
            await appendMessage(recipientThread, 'them', defaultMessage, locationUrl);

            notifiedCount += 1;
        }

        return res.status(200).json({
            success: true,
            message: 'SOS alert sent',
            defaultMessage,
            locationUrl,
            notifiedCount,
            skippedCount,
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    sendSOSAlert,
};