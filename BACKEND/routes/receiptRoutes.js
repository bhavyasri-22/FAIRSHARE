const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/scan', async (req, res) => {
  try {
    const { base64, mimeType } = req.body;

    if (!base64) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    // 🔥 Mindee API call
    const response = await axios.post(
      'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict',
      {
        document: base64   // 👈 IMPORTANT format
      },
      {
        headers: {
          Authorization: 'Token YOUR_MINDEE_API_KEY',
          'Content-Type': 'application/json'
        }
      }
    );

    // 🔥 Extract useful data
    const prediction = response.data.document.inference.prediction;

    const amount = prediction.total_amount || null;
    const description = prediction.supplier_name || '';

    res.json({
      amount,
      description
    });

  } catch (err) {
    console.error('Mindee error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Receipt scan failed' });
  }
});

module.exports = router;