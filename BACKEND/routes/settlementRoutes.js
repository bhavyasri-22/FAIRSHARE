const express = require('express');
const router  = express.Router();
const protect = require('../middleware/authMiddleware');
const { recordSettlement, getSettlementHistory } = require('../controllers/settlementController');

router.post('/',           protect, recordSettlement);      // POST /api/settlements
router.get('/:groupId',    protect, getSettlementHistory);  // GET  /api/settlements/:groupId

module.exports = router;