const axios = require('axios');
const moment = require('moment');
const { generatePassword, formatPhoneNumber } = require('../utils/helpers');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    this.accountReference = process.env.MPESA_ACCOUNT_REFERENCE;
    this.transactionDesc = process.env.MPESA_TRANSACTION_DESC;
    
    // API URLs
    this.authUrl = process.env.MPESA_AUTH_URL;
    this.stkPushUrl = process.env.MPESA_STK_PUSH_URL;
    this.queryUrl = process.env.MPESA_QUERY_URL;
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth access token from M-Pesa API
   */
  async getAccessToken() {
    try {
      // Check if token is still valid
      if (this.accessToken && this.tokenExpiry && moment().isBefore(this.tokenExpiry)) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(this.authUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Set expiry time (subtract 60 seconds for safety)
        this.tokenExpiry = moment().add(response.data.expires_in - 60, 'seconds');
        
        console.log('✅ M-Pesa access token obtained successfully');
        return this.accessToken;
      }

      throw new Error('Failed to obtain access token');
    } catch (error) {
      console.error('❌ Error getting M-Pesa access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with M-Pesa API');
    }
  }

  /**
   * Initiate STK Push payment
   */
  async initiateSTKPush(phoneNumber, amount, accountReference = null, transactionDesc = null) {
    try {
      // Validate inputs
      if (!phoneNumber || !amount) {
        throw new Error('Phone number and amount are required');
      }
      // Support both "CustomerPayBillOnline" and "CustomerBuyGoodsOnline" (STK Push to till)
      let transactionType = "CustomerPayBillOnline";
      if (accountReference && accountReference.toLowerCase().includes('till')) {
        transactionType = "CustomerBuyGoodsOnline";
      }
      // Format phone number
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      // Validate amount
      if (amount < 1 || amount > 70000) {
        throw new Error('Amount must be between 1 and 70,000 KES');
      }

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate timestamp and password
      const timestamp = moment().format('YYYYMMDDHHmmss');
      const password = generatePassword(this.businessShortCode, this.passkey, timestamp);

      // Prepare request payload
      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount), // Ensure amount is integer
        PartyA: formattedPhone,
        PartyB: this.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: accountReference || this.accountReference,
        TransactionDesc: transactionDesc || this.transactionDesc
      };

      console.log('📤 Initiating STK Push:', {
        phone: formattedPhone,
        amount: amount,
        reference: payload.AccountReference
      });

      // Make API request
      const response = await axios.post(this.stkPushUrl, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.ResponseCode === "0") {
        console.log('✅ STK Push initiated successfully');
        return {
          success: true,
          message: 'STK Push initiated successfully',
          data: {
            merchantRequestID: response.data.MerchantRequestID,
            checkoutRequestID: response.data.CheckoutRequestID,
            responseCode: response.data.ResponseCode,
            responseDescription: response.data.ResponseDescription,
            customerMessage: response.data.CustomerMessage
          }
        };
      } else {
        throw new Error(response.data.ResponseDescription || 'STK Push failed');
      }
    } catch (error) {
      console.error('❌ STK Push error:', error.response?.data || error.message);
      
      // Handle specific M-Pesa errors
      if (error.response?.data?.errorMessage) {
        throw new Error(error.response.data.errorMessage);
      }
      
      throw new Error(error.message || 'Failed to initiate STK Push');
    }
  }

  /**
   * Query STK Push transaction status
   */
  async querySTKPushStatus(checkoutRequestID) {
    try {
      if (!checkoutRequestID) {
        throw new Error('Checkout Request ID is required');
      }

      // Get access token
      const accessToken = await this.getAccessToken();

      // Generate timestamp and password
      const timestamp = moment().format('YYYYMMDDHHmmss');
      const password = generatePassword(this.businessShortCode, this.passkey, timestamp);

      // Prepare request payload
      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      console.log('🔍 Querying STK Push status:', checkoutRequestID);

      // Make API request
      const response = await axios.post(this.queryUrl, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 STK Push query response:', response.data);

      return {
        success: true,
        data: {
          merchantRequestID: response.data.MerchantRequestID,
          checkoutRequestID: response.data.CheckoutRequestID,
          responseCode: response.data.ResponseCode,
          responseDescription: response.data.ResponseDescription,
          resultCode: response.data.ResultCode,
          resultDesc: response.data.ResultDesc
        }
      };
    } catch (error) {
      console.error('❌ STK Push query error:', error.response?.data || error.message);
      
      if (error.response?.data?.errorMessage) {
        throw new Error(error.response.data.errorMessage);
      }
      
      throw new Error(error.message || 'Failed to query STK Push status');
    }
  }

  /**
   * Process M-Pesa callback
   */
  async processCallback(callbackData) {
    try {
      console.log('📞 Processing M-Pesa callback:', JSON.stringify(callbackData, null, 2));

      const { Body } = callbackData;
      const { stkCallback } = Body;

      const result = {
        merchantRequestID: stkCallback.MerchantRequestID,
        checkoutRequestID: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc,
        timestamp: moment().toISOString()
      };

      // Check if payment was successful
      if (stkCallback.ResultCode === 0) {
        // Payment successful - extract callback metadata
        const callbackMetadata = stkCallback.CallbackMetadata;
        const items = callbackMetadata.Item;

        const paymentData = {};
        items.forEach(item => {
          switch (item.Name) {
            case 'Amount':
              paymentData.amount = item.Value;
              break;
            case 'MpesaReceiptNumber':
              paymentData.mpesaReceiptNumber = item.Value;
              break;
            case 'TransactionDate':
              paymentData.transactionDate = item.Value;
              break;
            case 'PhoneNumber':
              paymentData.phoneNumber = item.Value;
              break;
            default:
              paymentData[item.Name] = item.Value;
          }
        });

        result.paymentData = paymentData;
        result.status = 'SUCCESS';
        
        console.log('✅ Payment successful:', paymentData);
      } else {
        result.status = 'FAILED';
        console.log('❌ Payment failed:', stkCallback.ResultDesc);
      }

      return result;
    } catch (error) {
      console.error('❌ Error processing callback:', error);
      throw new Error('Failed to process M-Pesa callback');
    }
  }
}

module.exports = new MpesaService();