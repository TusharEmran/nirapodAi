const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ success: false, message: 'Authorization token is required' });
    }

    try {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('JWT_SECRET is not set');
        }

        req.user = jwt.verify(token, secret);
        return next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}

module.exports = {
    authRequired,
};
