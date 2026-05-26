const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
    {
        sender: { type: String, enum: ['me', 'them'], required: true },
        text: { type: String, default: '', trim: true },
        imageUrl: { type: String, default: '', trim: true },
        locationUrl: { type: String, default: '', trim: true },
        read: { type: Boolean, default: false },
    },
    { timestamps: true },
);

const chatThreadSchema = new mongoose.Schema(
    {
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        contactId: { type: String, required: true, trim: true },
        contactName: { type: String, required: true, trim: true },
        subtitle: { type: String, default: '', trim: true },
        accent: { type: String, default: '#F1A7AF', trim: true },
        unread: { type: Boolean, default: false },
        lastMessage: { type: String, default: '', trim: true },
        lastMessageAt: { type: Date, default: null },
        messages: { type: [chatMessageSchema], default: [] },
    },
    { timestamps: true },
);

chatThreadSchema.index({ ownerId: 1, contactId: 1 }, { unique: true });

module.exports = mongoose.model('ChatThread', chatThreadSchema);