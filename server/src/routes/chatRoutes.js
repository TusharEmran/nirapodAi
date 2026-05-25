const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getThread, getThreads, postMessage } = require('../controllers/chatController');

const router = express.Router();

router.get('/threads', authRequired, getThreads);
router.get('/threads/:contactId', authRequired, getThread);
router.post('/threads/:contactId/messages', authRequired, postMessage);

module.exports = router;