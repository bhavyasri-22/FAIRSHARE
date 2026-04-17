const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware'); // must export a function
const { createGroup, joinGroup, getMyGroups, removeMember, leaveGroup } = require('../controllers/groupController');

router.post('/', protect, createGroup);
router.post('/join', protect, joinGroup);
router.get('/my', protect, getMyGroups);
router.delete('/:groupId/members/:memberId', protect, removeMember);
router.post('/:groupId/leave', protect, leaveGroup);

module.exports = router;