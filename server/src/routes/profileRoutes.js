const express = require('express');
const { authRequired } = require('../middleware/auth');
const { addContact, deleteContact, getContacts, getProfile, updateContact, updateProfile } = require('../controllers/profileController');

const router = express.Router();

router.get('/', authRequired, getProfile);
router.put('/', authRequired, updateProfile);
router.get('/contacts', authRequired, getContacts);
router.post('/contacts', authRequired, addContact);
router.put('/contacts/:contactId', authRequired, updateContact);
router.delete('/contacts/:contactId', authRequired, deleteContact);

module.exports = router;
