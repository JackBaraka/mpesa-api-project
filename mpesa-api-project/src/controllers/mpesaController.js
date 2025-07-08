const mpesaService = require('../services/mpesaService');

class MpesaController {
  /**
   * Initiate STK Push payment
   */
  async initiateSTKPush(req, res) {
    try {
      const { phone, amount, accountReference, transactionDesc } = req.body;

      // Validate required fields
      if (!phone || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and amount are required',
          data: null
        });
      }

      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a valid positive number',
          data: null
        });
      }

      // Initiate STK Push
      const result = await mpesaService.initiateSTKPush(
        phone,
        parseFloat(amount),
        accountReference,
        transactionDesc
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('STK Push error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to initiate STK Push',
        data: null
      });
    }
  }

  /**
   * Query STK Push transaction status
   */
  async querySTKPushStatus(req, res) {
    try {
      const { checkoutRequestID } = req.body;

      // Validate required fields
      if (!checkoutRequestID) {
        return res.status(400).json({
          success: false,
          message: 'Checkout Request ID is required',
          data: null
        });
      }

      // Query transaction status
      const result = await mpesaService.querySTKPushStatus(checkoutRequestID);

      res.status(200).json(result);
    } catch (error) {
      console.error('STK Push query error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to query STK Push status',
        data: null
      });
    }
  }

  /**
   * Handle M-Pesa callback
   */
  async handleCallback(req, res) {
    try {
      console.log('📞 Received M-Pesa callback');
      
      // Process the callback
      const result = await mpesaService.processCallback(req.body);

      // Log the processed result
      console.log('Processed callback result:', result);

      // Here you would typically:
      // 1. Save the transaction details to your database
      // 2. Update order status
      // 3. Send notifications to users
      // 4. Trigger any business logic

      // Example: Save to database (implement your own logic)
      // await saveTransactionToDatabase(result);

      // Always respond with success to acknowledge receipt
      res.status(200).json({
        success: true,
        message: 'Callback processed successfully',
        data: result
      });
    } catch (error) {
      console.error('Callback processing error:', error);
      
      // Even if processing fails, acknowledge receipt to M-Pesa
      res.status(200).json({
        success: false,
        message: 'Callback processing failed',
        error: error.message
      });
    }
  }

  /**
   * Get service status
   */
  async getStatus(req, res) {
    try {
      // Test M-Pesa connectivity by getting access token
      await mpesaService.getAccessToken();

      res.status(200).json({
        success: true,
        message: 'M-Pesa service is operational',
        data: {
          timestamp: new Date().toISOString(),
          businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
          environment: process.env.NODE_ENV || 'development'
        }
      });
    } catch (error) {
      console.error('Service status error:', error);
      res.status(500).json({
        success: false,
        message: 'M-Pesa service is not operational',
        error: error.message
      });
    }
  }

  /**
   * Test endpoint for development
   */
  async testPayment(req, res) {
    try {
      // Only allow in development environment
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'Test endpoint not available in production',
          data: null
        });
      }

      // Test with default values
      const testData = {
        phone: '254712345678', // Test phone number
        amount: 1, // Minimum amount
        accountReference: 'TEST001',
        transactionDesc: 'Test payment'
      };

      console.log('🧪 Initiating test payment:', testData);

      const result = await mpesaService.initiateSTKPush(
        testData.phone,
        testData.amount,
        testData.accountReference,
        testData.transactionDesc
      );

      res.status(200).json({
        success: true,
        message: 'Test payment initiated successfully',
        data: result.data,
        testData: testData
      });
    } catch (error) {
      console.error('Test payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Test payment failed',
        data: null
      });
    }
  }
}

module.exports = new MpesaController();