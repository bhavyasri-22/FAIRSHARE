const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/authMiddleware');
const {
  createOrder,
  verifyPayment,
  getPaymentHistory,
} = require('../controllers/paymentController');

// POST /api/payments/create-order  → create a Razorpay order
router.post('/create-order', protect, createOrder);

// POST /api/payments/verify        → verify signature & record settlement
router.post('/verify', protect, verifyPayment);

// GET  /api/payments/:groupId      → payment history for a group
router.get('/:groupId', protect, getPaymentHistory);

module.exports = router;