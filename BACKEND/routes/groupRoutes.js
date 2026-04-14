const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware'); // must export a function
const { createGroup, joinGroup, getMyGroups, removeMember } = require('../controllers/groupController');

router.post('/', protect, createGroup);
router.post('/join', protect, joinGroup);
router.get('/my', protect, getMyGroups);
router.delete('/:groupId/members/:memberId', protect, removeMember);

module.exports = router;