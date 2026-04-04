const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/authMiddleware');

// GET all messages for a group
router.get('/:groupId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      group: req.params.groupId,
    })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

module.exports = router;