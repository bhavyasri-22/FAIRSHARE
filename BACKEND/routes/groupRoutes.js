const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware'); // must export a function
const { createGroup, joinGroup, getMyGroups } = require('../controllers/groupController');

router.post('/', protect, createGroup);
router.post('/join', protect, joinGroup);
router.get('/my', protect, getMyGroups);

module.exports = router;