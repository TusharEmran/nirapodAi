const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const profileRoutes = require('./routes/profileRoutes');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8000);
const allowedOrigins = (process.env.CLIENT_ORIGINS || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || !isProduction || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`Origin ${origin} is not allowed by CORS`));
        },
        credentials: true,
    }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/profile', profileRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

app.use((err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});

async function start() {
    app.listen(port, () => {
        console.log(`Auth API running on port ${port}`);
    });

    try {
        await connectDB();
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
    }
}

start().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
});
