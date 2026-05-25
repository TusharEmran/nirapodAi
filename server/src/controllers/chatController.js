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

    if (validContactIds.length === 0) {
        await ChatThread.deleteMany({ ownerId: owner._id });
        return [];
    }

    await ChatThread.deleteMany({
        ownerId: owner._id,
        contactId: { $nin: validContactIds },
    });

    return threads;
}

async function getContactThreadContext(req) {
    const owner = await User.findById(req.user.sub).select('emergencyContacts');

    if (!owner) {
        return { error: { status: 404, message: 'User not found' } };
    }

    const contact = (owner.emergencyContacts || []).id(req.params.contactId);

    if (!contact) {
        return { error: { status: 404, message: 'Contact not found' } };
    }

    const appUser = await User.findOne({
        phone: normalizePhone(contact.phone),
        _id: { $ne: owner._id },
    }).select('_id fullName phone');

    if (!appUser) {
        return { error: { status: 404, message: 'This contact is not on the app yet' } };
    }

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

    return { owner, contact, thread };
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
            thread: {
                id: thread.contactId,
                name: thread.contactName,
                subtitle: thread.subtitle,
                accent: thread.accent,
                unread: thread.unread,
                message: thread.lastMessage || '',
                time: thread.lastMessageAt ? formatClockLabel(thread.lastMessageAt) : '',
                messages: thread.messages.map(serializeMessage),
            },
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

        const { thread } = context;
        const messageText = text || (imageUrl ? 'Shared a photo.' : '');

        thread.messages.push({
            sender: 'me',
            text: messageText,
            imageUrl,
            read: true,
        });
        thread.lastMessage = imageUrl ? (text || 'Photo') : text;
        thread.lastMessageAt = new Date();
        thread.unread = false;

        await thread.save();

        return res.status(201).json({
            success: true,
            thread: {
                id: thread.contactId,
                name: thread.contactName,
                subtitle: thread.subtitle,
                accent: thread.accent,
                unread: thread.unread,
                message: thread.lastMessage || '',
                time: thread.lastMessageAt ? formatClockLabel(thread.lastMessageAt) : '',
                messages: thread.messages.map(serializeMessage),
            },
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