const express = require('express');
const { authRequired } = require('../middleware/auth');
const { addContact, getContacts, getProfile, updateProfile } = require('../controllers/profileController');

const router = express.Router();

router.get('/', authRequired, getProfile);
router.put('/', authRequired, updateProfile);
router.get('/contacts', authRequired, getContacts);
router.post('/contacts', authRequired, addContact);

module.exports = router;
