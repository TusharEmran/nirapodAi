const express = require('express');
const multer = require('multer');
const { authRequired } = require('../middleware/auth');
const { uploadMedia } = require('../controllers/mediaController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', authRequired, upload.single('file'), uploadMedia);

module.exports = router;