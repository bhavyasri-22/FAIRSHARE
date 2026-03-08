const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { addExpense, getGroupExpenses , getSettlements} = require('../controllers/expenseController');

router.post('/', protect, addExpense);
router.get('/:groupId', protect, getGroupExpenses);
router.get('/:groupId/settle', protect, getSettlements); // add this

module.exports = router;