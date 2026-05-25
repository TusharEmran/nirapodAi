const express = require('express');
const { authRequired } = require('../middleware/auth');
const { login, me, resendOtp, signup, verifyOtp } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.get('/me', authRequired, me);

module.exports = router;
