const express = require('express');
const mpesaController = require('../controllers/mpesaController');

const router = express.Router();

// STK Push routes
router.post('/stkpush', mpesaController.initiateSTKPush);
router.post('/query', mpesaController.querySTKPushStatus);

// Callback route - M-Pesa will POST to this endpoint
router.post('/callback', mpesaController.handleCallback);

// Service status route
router.get('/status', mpesaController.getStatus);

// Test route (development only)
router.post('/test', mpesaController.testPayment);

// Additional utility routes
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'M-Pesa API routes are healthy',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'POST /api/mpesa/stkpush',
      'POST /api/mpesa/query',
      'POST /api/mpesa/callback',
      'GET /api/mpesa/status',
      'POST /api/mpesa/test',
      'GET /api/mpesa/health'
    ]
  });
});

module.exports = router;