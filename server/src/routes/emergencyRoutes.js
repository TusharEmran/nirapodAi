const express = require('express');
const { authRequired } = require('../middleware/auth');
const { sendSOSAlert } = require('../controllers/emergencyController');

const router = express.Router();

router.post('/sos', authRequired, sendSOSAlert);

module.exports = router;