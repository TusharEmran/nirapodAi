const mongoose = require('mongoose');

async function connectDB() {
    const uri = process.env.MONGODB_URI;
    const fallbackUri = process.env.MONGODB_URI_FALLBACK || 'mongodb://127.0.0.1:27017/nirapodai';

    if (!uri) {
        throw new Error('MONGODB_URI is not set');
    }

    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB Atlas');
    } catch (error) {
        console.warn('Primary MongoDB connection failed, trying local fallback...');

        await mongoose.connect(fallbackUri);
        console.log('Connected to local MongoDB fallback');
    }
}

module.exports = {
    connectDB,
};
