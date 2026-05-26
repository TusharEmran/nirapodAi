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

function serializeThread(thread) {
    return {
        id: thread.contactId,
        name: thread.contactName,
        subtitle: thread.subtitle,
        accent: thread.accent,
        unread: thread.unread,
        message: thread.lastMessage || '',
        time: thread.lastMessageAt ? formatClockLabel(thread.lastMessageAt) : '',
        messages: thread.messages.map(serializeMessage),
    };
}

function summarizeThread(thread) {
    return {
        id: thread.contactId,
        name: thread.contactName,
        subtitle: thread.subtitle,
        accent: thread.accent,
        message: thread.lastMessage || '',
        time: thread.lastMessageAt ? formatClockLabel(thread.lastMessageAt) : '',
        unread: thread.unread,
    };
}

function formatClockLabel(date) {
    return date
        .toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
        })
        .replace('AM', 'AM')
        .replace('PM', 'PM');
}

function serializeMessage(message) {
    return {
        id: message._id,
        sender: message.sender,
        text: message.text || '',
        imageUrl: message.imageUrl || '',
        locationUrl: message.locationUrl || '',
        read: message.read,
        time: formatClockLabel(message.createdAt || new Date()),
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
    };
}

async function ensureSeedThread(ownerId, seed) {
    const existing = await ChatThread.findOne({ ownerId, contactId: seed.contactId });

    if (existing) {
        return existing;
    }

    const messages = seed.messages.map((message) => ({
        sender: message.sender,
        text: message.text,
        read: message.sender === 'them' ? false : true,
    }));
    const lastMessage = seed.messages[seed.messages.length - 1] || null;

    return ChatThread.create({
        ownerId,
        contactId: seed.contactId,
        contactName: seed.contactName,
        subtitle: seed.subtitle,
        accent: seed.accent,
        unread: seed.unread,
        lastMessage: lastMessage?.text || '',
        lastMessageAt: new Date(),
        messages,
    });
}

async function getAppUserContactThreads(owner) {
    const threads = [];
    const validContactIds = [];

    for (const contact of owner.emergencyContacts || []) {
        const appUser = await User.findOne({
            phone: normalizePhone(contact.phone),
            _id: { $ne: owner._id },
        }).select('_id fullName phone');

        if (!appUser) {
            continue;
        }

        validContactIds.push(String(contact._id));

        let thread = await ChatThread.findOne({ ownerId: owner._id, contactId: String(contact._id) });

        if (!thread) {
            thread = await ChatThread.create({
                ownerId: owner._id,
                contactId: String(contact._id),
                contactName: contact.name,
                subtitle: contact.relationship || 'App user',
                accent: buildAvatarColor(contact.name),
                unread: false,
                lastMessage: '',
                lastMessageAt: null,
                messages: [],
            });
        } else {
            thread.contactName = contact.name;
            thread.subtitle = contact.relationship || 'App user';
            thread.accent = buildAvatarColor(contact.name);
            await thread.save();
        }

        threads.push(thread);
    }

    const incomingThreads = await ChatThread.find({
        ownerId: owner._id,
        contactId: { $nin: validContactIds },
    });

    return [...threads, ...incomingThreads];
}

function findContactForUser(owner, appUser) {
    return (owner.emergencyContacts || []).find((contact) => normalizePhone(contact.phone) === normalizePhone(appUser.phone));
}

async function findAppUserForContact(owner, contactId) {
    const contact = (owner.emergencyContacts || []).id(contactId);

    if (contact) {
        const appUser = await User.findOne({
            phone: normalizePhone(contact.phone),
            _id: { $ne: owner._id },
        }).select('_id fullName phone emergencyContacts');

        if (!appUser) {
            return { error: { status: 404, message: 'This contact is not on the app yet' } };
        }

        return { contact, appUser, contactId: String(contact._id) };
    }

    const appUser = await User.findById(contactId).select('_id fullName phone emergencyContacts');

    if (!appUser || String(appUser._id) === String(owner._id)) {
        return { error: { status: 404, message: 'Contact not found' } };
    }

    return {
        contact: null,
        appUser,
        contactId: String(appUser._id),
    };
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

async function getContactThreadContext(req) {
    const owner = await User.findById(req.user.sub).select('fullName phone emergencyContacts');

    if (!owner) {
        return { error: { status: 404, message: 'User not found' } };
    }

    const contactContext = await findAppUserForContact(owner, req.params.contactId);

    if (contactContext.error) {
        return { error: contactContext.error };
    }

    const { appUser, contact, contactId } = contactContext;
    const thread = await findOrCreateThread({ owner, contact, appUser, contactId });

    return { owner, appUser, contact, thread };
}

async function mirrorMessageToRecipient({ sender, recipient, text, imageUrl }) {
    const reciprocalContact = findContactForUser(recipient, sender);
    const recipientContactId = reciprocalContact ? String(reciprocalContact._id) : String(sender._id);
    const recipientThread = await findOrCreateThread({
        owner: recipient,
        contact: reciprocalContact,
        appUser: sender,
        contactId: recipientContactId,
        unread: true,
    });

    const messageText = text || (imageUrl ? 'Shared a photo.' : '');

    recipientThread.messages.push({
        sender: 'them',
        text: messageText,
        imageUrl,
        read: false,
    });
    recipientThread.lastMessage = imageUrl ? (text || 'Photo') : text;
    recipientThread.lastMessageAt = new Date();
    recipientThread.unread = true;

    await recipientThread.save();
}

async function getThreads(req, res, next) {
    try {
        const owner = await User.findById(req.user.sub).select('emergencyContacts');

        if (!owner) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const threads = await getAppUserContactThreads(owner);

        return res.status(200).json({
            success: true,
            threads: threads.sort((left, right) => {
                const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
                const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
                return rightTime - leftTime;
            }).map(summarizeThread),
        });
    } catch (error) {
        return next(error);
    }
}

async function getThread(req, res, next) {
    try {
        const context = await getContactThreadContext(req);

        if (context.error) {
            return res.status(context.error.status).json({ success: false, message: context.error.message });
        }

        const { thread } = context;

        if (thread.unread) {
            thread.unread = false;
            await thread.save();
        }

        return res.status(200).json({
            success: true,
            thread: serializeThread(thread),
        });
    } catch (error) {
        return next(error);
    }
}

async function postMessage(req, res, next) {
    try {
        const text = String(req.body.text || '').trim();
        const imageUrl = String(req.body.imageUrl || '').trim();

        if (!text && !imageUrl) {
            return res.status(400).json({ success: false, message: 'text or imageUrl is required' });
        }

        const context = await getContactThreadContext(req);

        if (context.error) {
            return res.status(context.error.status).json({ success: false, message: context.error.message });
        }

        const { owner, appUser, thread } = context;
        const messageText = text || (imageUrl ? 'Shared a photo.' : '');

        thread.messages.push({
            sender: 'me',
            text: messageText,
            imageUrl,
            locationUrl: '',
            read: true,
        });
        thread.lastMessage = imageUrl ? (text || 'Photo') : text;
        thread.lastMessageAt = new Date();
        thread.unread = false;

        await thread.save();
        await mirrorMessageToRecipient({ sender: owner, recipient: appUser, text, imageUrl });

        return res.status(201).json({
            success: true,
            thread: serializeThread(thread),
            message: serializeMessage(thread.messages[thread.messages.length - 1]),
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getThreads,
    getThread,
    postMessage,
};
